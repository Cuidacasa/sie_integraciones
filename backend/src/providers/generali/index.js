const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');


class GeneraliProvider extends BaseProvider {
    constructor(compania) {
        super(compania);
        this.providerName = 'GeneraliProvider';
    }

async  fetchData(options) {
    
    const client = new ImapFlow({
        host,
        port,
        secure,
        auth: { user, pass: password }
    });
    await client.connect();

    let emails = [];
    // Buscar solo correos no leídos con asunto "Nuevo encargo"
    for await (let msg of client.fetch('1:*', { envelope: true, source: true, flags: true })) {
        if (msg.envelope.subject && msg.envelope.subject.includes('Nuevo encargo')) {
            const parsed = await simpleParser(msg.source);
            emails.push({
                subject: parsed.subject,
                from: parsed.from.text,
                to: parsed.to.text,
                cc: parsed.cc ? parsed.cc.text : '',
                bcc: parsed.bcc ? parsed.bcc.text : '',
                body: parsed.text,
                attachments: parsed.attachments
            });
        }
    }
    await client.logout();
    return emails;
}

}
module.exports = { fetchEmails };
