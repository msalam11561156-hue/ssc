export async function downloadControlWorkGuide() {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة لطباعة دليل أعمال الكنترول.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>دليل أعمال الكنترول المدرسي</title>
      <style>
        body { font-family: 'Cairo', Tahoma, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; line-height: 1.8; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        h1 { text-align: center; color: #0f172a; margin-bottom: 8px; font-size: 26px; }
        h2 { color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; font-size: 20px; }
        p, li { font-size: 15px; color: #334155; }
        ul { padding-right: 20px; }
        .footer { text-align: center; margin-top: 40px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        @media print {
          body { background: white; padding: 0; }
          .container { box-shadow: none; padding: 20px; }
          .no-print { display: none; }
        }
        .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 20px; cursor: pointer; border: none; }
        .btn:hover { background: #1d4ed8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="text-align: center;" class="no-print">
          <button class="btn" onclick="window.print()">طباعة الدليل / حفظ PDF</button>
        </div>
        <h1>دليل أعمال الكنترول المدرسي والنظم الإمتحانية</h1>
        <p style="text-align: center; color: #64748b; margin-bottom: 30px;">مرجع شامل لضبط أعمال الامتحانات ورصد الدرجات والكنترول</p>

        <h2>1. تشكيل لجنة الكنترول والمهام الأساسية</h2>
        <ul>
          <li><strong>رئيس الكنترول:</strong> المسؤول الأول عن أعمال الكنترول وإدارة وتأمين حجرة الكنترول وحفظ السرية التامة.</li>
          <li><strong>وكيل الكنترول / الأعضاء:</strong> مراجعة كثافات الطلاب، استلام كشوف ورصد الدرجات، ومراجعة كشوف الشيت ورصد الدرجات بدقة.</li>
          <li><strong>لجنة النظام والمراقبة:</strong> استقبال أوراق الاجابه ومراجعتها وتفريغها في الشيتات الإلكترونية أو الورقية دون كشط أو تحريف.</li>
        </ul>

        <h2>2. قواعد رصد وتجميع الدرجات</h2>
        <ul>
          <li>مراجعة تجميع درجات أعمال السنة، الاختبارات الشهرية، واختبار نهاية الفصل الدراسي.</li>
          <li>تطبيق قرارات الرأفة (إن وجدت) وفقاً للقرارات الوزارية المنظمة وبناءً على إعدادات نظام الرأفة في التطبيق.</li>
          <li>التوقيع الثلاثي على جميع الكشوف النهائية بعد المراجعة الدقيقة والمطابقة بين الشيت الورقي والإلكتروني.</li>
        </ul>

        <h2>3. أمن وحفظ وثائق الكنترول</h2>
        <ul>
          <li>الحفاظ على سرية وسلامة كشوف درجات الطلاب وأرقام الجلوس.</li>
          <li>إغلاق وتأمين غرفة الكنترول دائماً وعدم السماح بدخول غير المهام المرخص لهم.</li>
          <li>الاحتفاظ بنسخ احتياطية وتصدير البيانات وحفظها بشكل آمن.</li>
        </ul>

        <div class="footer">
          <p>تم استخراج هذا الدليل تلقائياً من نظام إدارة الكنترول الذكي (Smart Control System)</p>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}
