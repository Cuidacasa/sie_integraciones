// src/integraciones/asitur/index.js

const BaseProvider = require('../../core/baseProvider');
const { obtenerTokenDiaple, enviarA_Diaple, enviarAUnprocessable } = require('./apiClient');
const { parsearCorreo, correoToExpediente, obtenerTipoComunicacion } = require('./dataProcessor');
const { ImapFlow } = require('imapflow');

class AsiturProvider extends BaseProvider {
  constructor(compania) {
    super(compania);
    this.providerName = 'AsiturProvider';
    this.token = null;
  }

  async authenticate() {
    this.token = await obtenerTokenDiaple();
  }

  async fetchData(options) {
    const mensajes = [];
    for (const cuenta of options.compania) {
      const client = new ImapFlow({
        host: cuenta.host,
        port: cuenta.port,
        secure: cuenta.secure[0],
        auth: { user: cuenta.user, pass: cuenta.password },
        tls: { rejectUnauthorized: false },
        logger: false
      });

      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        for await (let msg of client.fetch('1:*', { envelope: true, source: true })) {
          mensajes.push({ cuenta, msg });
        }
      } finally {
        lock.release();
        await client.logout();
      }
    }
    return mensajes;
  }

  transformData(rawItems) {
    const resultados = [];
    for (const { cuenta, msg } of rawItems) {
      resultados.push({ cuenta: cuenta.user, source: msg.source });
    }
    return resultados;
  }

  async processRawData(items) {
    for (const item of items) {
      const parsed = await parsearCorreo(item.source);
      const caseLogTypeCode = obtenerTipoComunicacion(parsed.subject);
      const expediente = correoToExpediente(parsed, item.cuenta);

      if (!expediente.caseNumber && caseLogTypeCode === 'INCORRECT') {
        await enviarAUnprocessable({
          from: expediente.from,
          date: expediente.date,
          subject: expediente.subject,
          contractCode: ''
        }, this.token);
        continue;
      }

      await enviarA_Diaple(expediente, this.token);
    }
  }

  getProviderInfo() {
    return {
      ...super.getProviderInfo(),
      name: 'Asitur',
      description: 'Proveedor que procesa correos entrantes vía IMAP desde Asitur',
      features: ['imap_fetch', 'email_parse', 'expediente_transform', 'diaple_forward']
    };
  }
}

module.exports = AsiturProvider;
