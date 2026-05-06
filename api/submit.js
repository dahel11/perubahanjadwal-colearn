const APPS_SCRIPT_URL   = 'https://script.google.com/macros/s/AKfycbwf0JwNLm2MLzXEu49H63fwEaA_UIzemO0hmQkWdP06v6vzJLYndFM0_rikoADHIA1j/exec';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

async function sendSlackNotif(body, jadwalBaru, jadwalSlots) {
  try {
    const mapelKeys = Object.keys(jadwalBaru);
    const jadwalLines = mapelKeys.map(mapel => {
      const slot   = jadwalSlots[mapel] || '-';
      const detail = jadwalBaru[mapel]  || '-';
      return `*${mapel}*\n    Slot: \`${slot}\`\n    Jadwal: ${detail}`;
    }).join('\n\n');

    const payload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📅 Permohonan Ubah Jadwal Baru', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Nama Murid:*\n${body.name || '-'}` },
            { type: 'mrkdwn', text: `*Kelas:*\n${body.grade || '-'}` },
            { type: 'mrkdwn', text: `*Nomor HP:*\n+62${body.phone_number || '-'}` },
            { type: 'mrkdwn', text: `*Paket:*\n${body.package_name || '-'}` },
            { type: 'mrkdwn', text: `*Agent:*\n${body.agent_name || '-'}` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Jadwal Baru yang Diminta:*\n\n${jadwalLines}` }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Alasan:*\n_${body.alasan || '-'}_` }
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕐 Diterima: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`
            }
          ]
        }
      ]
    };

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('Slack error:', err.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;

    let jadwalBaru  = {};
    let jadwalSlots = {};
    try { jadwalBaru  = JSON.parse(body.jadwal_baru || '{}'); } catch(_) {}
    try { jadwalSlots = JSON.parse(body.slot_names  || '{}'); } catch(_) {}

    const params = new URLSearchParams({
      action:       'submit',
      name:         body.name         || '',
      phone_number: body.phone_number || '',
      grade:        body.grade        || '',
      package_name: body.package_name || '',
      jadwal_baru:  body.jadwal_baru  || '{}',
      slot_names:   body.slot_names   || '{}',
      alasan:       body.alasan       || '',
      agent_name:   body.agent_name   || '',
      token:        body.token        || '',
      timestamp:    body.timestamp    || new Date().toISOString(),
    });

    const url = `${APPS_SCRIPT_URL}?${params.toString()}`;
    const response = await fetch(url, { redirect: 'follow' });
    const data = await response.json();

    await sendSlackNotif(body, jadwalBaru, jadwalSlots);

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}
