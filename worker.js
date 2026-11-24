export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = url.origin;

    // 1. الصفحة الرئيسية (زر تنزيل ملف التعريف)
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(renderHomePage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 2. توليد وتقديم ملف التعريف (.mobileconfig)
    if (request.method === 'GET' && url.pathname === '/udid.mobileconfig') {
      const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <dict>
        <key>URL</key>
        <string>${origin}/receive</string>
        <key>DeviceAttributes</key>
        <array>
            <string>UDID</string>
            <string>PRODUCT</string>
            <string>VERSION</string>
            <string>SERIAL</string>
        </array>
    </dict>
    <key>PayloadOrganization</key>
    <string>UDID Service</string>
    <key>PayloadDisplayName</key>
    <string>استخراج UDID</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
    <key>PayloadUUID</key>
    <string>${crypto.randomUUID().toUpperCase()}</string>
    <key>PayloadIdentifier</key>
    <string>com.udid.service.profile</string>
    <key>PayloadDescription</key>
    <string>ملف تعريف مؤقت لاستخراج رمز UDID وبيانات الجهاز فقط.</string>
    <key>PayloadType</key>
    <string>Profile Service</string>
</dict>
</plist>`;

      return new Response(mobileconfig, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-apple-aspen-config; charset=utf-8',
          'Content-Disposition': 'attachment; filename="udid.mobileconfig"',
          'Cache-Control': 'no-store',
        },
      });
    }

    // 3. استقبال طلب POST من نظام iOS واستخراج البيانات
    if (request.method === 'POST' && url.pathname === '/receive') {
      const buffer = await request.arrayBuffer();
      const raw = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

      const start = raw.indexOf('<?xml');
      const end = raw.indexOf('</plist>');
      const xml =
        start !== -1 && end !== -1
          ? raw.slice(start, end + '</plist>'.length)
          : '';

      const extract = (key) => {
        const regex = new RegExp(
          `<key>${key}</key>\\s*<string>([^<]*)</string>`,
          'i'
        );
        const match = xml.match(regex);
        return match ? match[1].trim() : '';
      };

      const params = new URLSearchParams({
        udid: extract('UDID'),
        product: extract('PRODUCT'),
        version: extract('VERSION'),
        serial: extract('SERIAL'),
      });

      // إعادة توجيه 301 إلزامية لفتح صفحة النتيجة في Safari
      return new Response(null, {
        status: 301,
        headers: {
          Location: `${origin}/result?${params.toString()}`,
        },
      });
    }

    // 4. صفحة عرض الـ UDID وبيانات الجهاز
    if (request.method === 'GET' && url.pathname === '/result') {
      const data = {
        udid: url.searchParams.get('udid') || 'غير متوفر',
        product: url.searchParams.get('product') || '-',
        version: url.searchParams.get('version') || '-',
        serial: url.searchParams.get('serial') || '-',
      };

      return new Response(renderResultPage(data), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}

function renderHomePage() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>استخراج UDID</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; display: flex; min-height: 100vh; align-items: center; justify-content: center; box-sizing: border-box; }
    .card { background: #1e293b; border-radius: 16px; padding: 28px 22px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
    h1 { margin: 0 0 10px; font-size: 22px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.7; margin: 0 0 22px; }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; background: #2563eb; color: #fff; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 16px; }
    .steps { text-align: right; margin-top: 22px; padding-top: 16px; border-top: 1px solid #334155; font-size: 13px; color: #cbd5e1; line-height: 1.9; }
  </style>
</head>
<body>
  <div class="card">
    <h1>استخراج رمز UDID</h1>
    <p>افتح هذه الصفحة عبر متصفح <strong>Safari</strong> على جهاز الآيفون أو الآيباد، ثم اضغط الزر أدناه لتنزيل ملف التعريف المؤقت.</p>
    <a class="btn" href="/udid.mobileconfig">استخراج UDID الآن</a>
    <div class="steps">
      1. اضغط <strong>السماح (Allow)</strong> عند ظهور نافذة التنزيل.<br />
      2. افتح <strong>الإعدادات ← تم تنزيل ملف التعريف ← تثبيت</strong>.<br />
      3. سيعيدك النظام تلقائياً هنا لعرض رمز الـ UDID.
    </div>
  </div>
</body>
</html>`;
}

function renderResultPage(data) {
  const udid = escapeHtml(data.udid);
  const product = escapeHtml(data.product);
  const version = escapeHtml(data.version);
  const serial = escapeHtml(data.serial);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>بيانات الجهاز - UDID</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; display: flex; min-height: 100vh; align-items: center; justify-content: center; box-sizing: border-box; }
    .card { background: #1e293b; border-radius: 16px; padding: 26px 20px; max-width: 440px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
    h1 { margin: 0 0 18px; font-size: 20px; text-align: center; }
    .box { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px; text-align: center; font-family: monospace; font-size: 15px; word-break: break-all; direction: ltr; margin-bottom: 14px; color: #38bdf8; }
    button { width: 100%; background: #10b981; color: #fff; border: none; padding: 13px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
    .meta { margin-top: 20px; border-top: 1px solid #334155; padding-top: 14px; font-size: 14px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; color: #cbd5e1; }
    .row span:last-child { font-family: monospace; direction: ltr; color: #f8fafc; }
  </style>
</head>
<body>
  <div class="card">
    <h1>تم استخراج UDID بنجاح</h1>
    <div class="box" id="udid">${udid}</div>
    <button onclick="copyUDID()" id="copyBtn">نسخ الـ UDID</button>
    <div class="meta">
      <div class="row"><span>الموديل (Product)</span><span>${product}</span></div>
      <div class="row"><span>رقم البناء (Version)</span><span>${version}</span></div>
      <div class="row"><span>الرقم التسلسلي (Serial)</span><span>${serial}</span></div>
    </div>
  </div>
  <script>
    function copyUDID() {
      const text = document.getElementById('udid').innerText;
      const btn = document.getElementById('copyBtn');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          btn.innerText = 'تم النسخ ✓';
          setTimeout(() => btn.innerText = 'نسخ الـ UDID', 2000);
        });
      }
    }
  </script>
</body>
</html>`;
}
