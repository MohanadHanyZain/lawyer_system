// db.js - قاعدة البيانات المتكاملة (بدون نظام مستخدمين)

// ========== دوال مساعدة آمنة للتشفير ==========
function safeBtoa(str) {
    if (!str) return '';
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch(e) {
        console.error('safeBtoa error:', e);
        return btoa(str);
    }
}

function safeAtob(str) {
    if (!str) return '';
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch(e) {
        try {
            return atob(str);
        } catch(e2) {
            console.error('safeAtob error:', e2);
            return '';
        }
    }
}

const db = new Dexie("LawFirmDB");

db.version(3).stores({
    clients: '++id, name, phone, address, nationalId, email, notes, createdAt, updatedAt',
    cases: '++id, caseNumber, title, clientId, opponent, opponentLawyer, caseType, status, court, circuit, fees, paidAmount, remainingAmount, subject, createdAt, updatedAt',
    sessions: '++id, caseId, sessionDate, sessionTime, decision, nextSessionDate, nextSessionTime, notes, createdAt',
    documents: '++id, caseId, clientId, docType, docName, docData, fileType, uploadDate, notes',
    expenses: '++id, caseId, expenseType, amount, description, expenseDate',
    invoices: '++id, clientId, caseId, invoiceNumber, amount, paidAmount, remainingAmount, status, issueDate, dueDate, notes',
    tasks: '++id, title, description, assignedTo, caseId, priority, status, dueDate, createdAt, completedAt',
    templates: '++id, name, type, content, category, createdAt',
    settings: '++id, key, value'
});

// بيانات افتراضية
db.on('populate', async () => {
    // نماذج عقود جاهزة
    await db.templates.bulkAdd([
        { name: 'عقد بيع', type: 'sale', category: 'عقود', content: getTemplateContent('sale'), createdAt: new Date() },
        { name: 'عقد إيجار', type: 'rent', category: 'عقود', content: getTemplateContent('rent'), createdAt: new Date() },
        { name: 'توكيل عام', type: 'power_of_attorney', category: 'توكيلات', content: getTemplateContent('power_of_attorney'), createdAt: new Date() },
        { name: 'عريضة دعوى', type: 'lawsuit', category: 'دعاوى', content: getTemplateContent('lawsuit'), createdAt: new Date() }
    ]);
    
    // إعدادات المكتب
    await db.settings.bulkAdd([
        { key: 'firmName', value: 'مكتب المحامي المحترف' },
        { key: 'firmLogo', value: '' },
        { key: 'taxNumber', value: '' },
        { key: 'phone', value: '' },
        { key: 'address', value: '' },
        { key: 'notificationEnabled', value: 'true' }
    ]);
});

function getTemplateContent(type) {
    const templates = {
        sale: `عقد بيع\n\nبتاريخ: ___/___/____\n\nالطرف الأول: السيد/ ___ (بائع)\nالطرف الثاني: السيد/ ___ (مشتري)\n\nالمبيع: ___ \nالثمن: ___ \n\nوقد أقر الطرفان بكامل أهليتهما القانونية، وحرر هذا العقد من نسختين.\n\nالبائع: ___________\nالمشتري: ___________`,
        rent: `عقد إيجار\n\nبتاريخ: ___/___/____\n\nالمؤجر: ___ \nالمستأجر: ___ \n\nالعين المؤجرة: ___ \nالأجرة الشهرية: ___ \nمدة العقد: ___ \n\nالمؤجر: ___________\nالمستأجر: ___________`,
        power_of_attorney: `توكيل عام\n\nبتاريخ: ___/___/____\n\nأنا السيد/ ___ \nقد وكلت السيد/ ___ \n\nبإدارة جميع أعمالي القانونية والمالية، وله حق التوقيع والتفويض.\n\nالموكل: ___________\nالوكيل: ___________`,
        lawsuit: `عريضة دعوى\n\nسيادة رئيس محكمة ___ \n\nبعد التحية،\n\nأنا السيد/ ___ \nأقيم دعواي ضدد السيد/ ___ \n\nموضوع الدعوى: ___ \n\nالطلبات:\n1- ___ \n2- ___ \n\nوكيل المدعي: ___________`
    };
    return templates[type] || templates.sale;
}

const DB = {
    // ========== إدارة الموكلين ==========
    saveClient: async (data) => {
        data.updatedAt = new Date();
        if (!data.createdAt) data.createdAt = new Date();
        return await db.clients.put(data);
    },
    getAllClients: async () => await db.clients.toArray(),
    getClientById: async (id) => await db.clients.get(id),
    deleteClient: async (id) => {
        await db.clients.delete(id);
        await db.cases.where('clientId').equals(id).delete();
    },
    searchClients: async (keyword) => {
        const clients = await db.clients.toArray();
        return clients.filter(c => 
            c.name.includes(keyword) || 
            c.phone.includes(keyword) || 
            (c.nationalId && c.nationalId.includes(keyword))
        );
    },
    
    // ========== إدارة القضايا ==========
    saveCase: async (data) => {
        data.updatedAt = new Date();
        if (!data.createdAt) data.createdAt = new Date();
        if (!data.fees) data.fees = 0;
        if (!data.paidAmount) data.paidAmount = 0;
        if (!data.remainingAmount) data.remainingAmount = data.fees;
        if (!data.status) data.status = 'متداولة';
        return await db.cases.put(data);
    },
    getAllCases: async () => {
        const cases = await db.cases.toArray();
        const clients = await db.clients.toArray();
        return cases.map(c => ({
            ...c,
            clientName: clients.find(cl => cl.id == c.clientId)?.name || 'غير معروف',
            remainingAmount: (c.fees || 0) - (c.paidAmount || 0)
        }));
    },
    getCasesByClient: async (clientId) => {
        return await db.cases.where('clientId').equals(clientId).toArray();
    },
    getCaseById: async (id) => await db.cases.get(id),
    deleteCase: async (id) => {
        await db.cases.delete(id);
        await db.sessions.where('caseId').equals(id).delete();
        await db.documents.where('caseId').equals(id).delete();
        await db.expenses.where('caseId').equals(id).delete();
        await db.tasks.where('caseId').equals(id).delete();
    },
    updateCaseStatus: async (id, status) => {
        const case_ = await db.cases.get(id);
        if (case_) {
            case_.status = status;
            case_.updatedAt = new Date();
            await db.cases.update(id, case_);
        }
    },
    updateCaseFinancials: async (id, paidAmount) => {
        const case_ = await db.cases.get(id);
        if (case_) {
            case_.paidAmount = paidAmount;
            case_.remainingAmount = case_.fees - paidAmount;
            case_.updatedAt = new Date();
            await db.cases.update(id, case_);
        }
    },
    searchCases: async (keyword) => {
        const cases = await db.cases.toArray();
        const clients = await db.clients.toArray();
        return cases.filter(c => 
            c.caseNumber.includes(keyword) || 
            c.title.includes(keyword) || 
            (c.subject && c.subject.includes(keyword)) ||
            clients.find(cl => cl.id == c.clientId)?.name.includes(keyword)
        ).map(c => ({
            ...c,
            clientName: clients.find(cl => cl.id == c.clientId)?.name || 'غير معروف'
        }));
    },
    
    // ========== إدارة الجلسات ==========
    saveSession: async (data) => {
        if (!data.createdAt) data.createdAt = new Date();
        return await db.sessions.put(data);
    },
    getAllSessions: async () => {
        const sessions = await db.sessions.toArray();
        const cases = await db.cases.toArray();
        return sessions.map(s => ({
            ...s,
            caseTitle: cases.find(c => c.id == s.caseId)?.title || 'غير معروف',
            caseNumber: cases.find(c => c.id == s.caseId)?.caseNumber || ''
        }));
    },
    getTodaySessions: async () => {
        const today = new Date().toISOString().split('T')[0];
        const sessions = await db.sessions.where('sessionDate').equals(today).toArray();
        const cases = await db.cases.toArray();
        return sessions.map(s => ({
            ...s,
            caseTitle: cases.find(c => c.id == s.caseId)?.title || 'غير معروف'
        }));
    },
    getUpcomingSessions: async () => {
        const today = new Date().toISOString().split('T')[0];
        const sessions = await db.sessions.where('sessionDate').above(today).toArray();
        const cases = await db.cases.toArray();
        return sessions.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)).map(s => ({
            ...s,
            caseTitle: cases.find(c => c.id == s.caseId)?.title || 'غير معروف'
        }));
    },
    deleteSession: async (id) => await db.sessions.delete(id),
    
    // ========== إدارة المستندات ==========
    saveDocument: async (data) => {
        data.uploadDate = new Date();
        return await db.documents.put(data);
    },
    getDocumentsByCase: async (caseId) => {
        return await db.documents.where('caseId').equals(caseId).toArray();
    },
    getDocumentsByClient: async (clientId) => {
        return await db.documents.where('clientId').equals(clientId).toArray();
    },
    deleteDocument: async (id) => await db.documents.delete(id),
    
    // ========== إدارة المصروفات ==========
    saveExpense: async (data) => {
        return await db.expenses.put(data);
    },
    getExpensesByCase: async (caseId) => {
        return await db.expenses.where('caseId').equals(caseId).toArray();
    },
    deleteExpense: async (id) => await db.expenses.delete(id),
    
    // ========== إدارة الفواتير ==========
    saveInvoice: async (data) => {
        data.issueDate = data.issueDate || new Date().toISOString().split('T')[0];
        if (!data.invoiceNumber) {
            const count = await db.invoices.count();
            data.invoiceNumber = `INV-${(count + 1).toString().padStart(5, '0')}`;
        }
        return await db.invoices.put(data);
    },
    getAllInvoices: async () => {
        const invoices = await db.invoices.toArray();
        const clients = await db.clients.toArray();
        return invoices.map(i => ({
            ...i,
            clientName: clients.find(c => c.id == i.clientId)?.name || 'غير معروف'
        }));
    },
    deleteInvoice: async (id) => await db.invoices.delete(id),
    
    // ========== إدارة المهام ==========
    saveTask: async (data) => {
        data.createdAt = new Date();
        if (!data.status) data.status = 'pending';
        return await db.tasks.put(data);
    },
    getAllTasks: async () => {
        const tasks = await db.tasks.toArray();
        const cases = await db.cases.toArray();
        return tasks.map(t => ({
            ...t,
            assignedToName: 'المكتب',
            caseTitle: cases.find(c => c.id == t.caseId)?.title || ''
        }));
    },
    getTasksByUser: async (userId) => {
        return await db.tasks.where('assignedTo').equals(userId).toArray();
    },
    updateTaskStatus: async (id, status) => {
        await db.tasks.update(id, { status, completedAt: status === 'completed' ? new Date() : null });
    },
    deleteTask: async (id) => await db.tasks.delete(id),
    
    // ========== النماذج الجاهزة ==========
    getAllTemplates: async () => await db.templates.toArray(),
    getTemplate: async (id) => await db.templates.get(id),
    saveTemplate: async (data) => {
        data.createdAt = new Date();
        return await db.templates.put(data);
    },
    deleteTemplate: async (id) => await db.templates.delete(id),
    
    // ========== الإحصائيات ==========
    getStats: async () => {
        const totalCases = await db.cases.count();
        const activeCases = await db.cases.where('status').equals('متداولة').count();
        const reservedCases = await db.cases.where('status').equals('محجوزة للحكم').count();
        const finishedCases = await db.cases.where('status').equals('منتهية').count();
        
        const cases = await db.cases.toArray();
        const totalFees = cases.reduce((sum, c) => sum + (c.fees || 0), 0);
        const totalPaid = cases.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
        const totalRemaining = totalFees - totalPaid;
        
        const expenses = await db.expenses.toArray();
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const todaySessions = (await DB.getTodaySessions()).length;
        const pendingTasks = await db.tasks.where('status').equals('pending').count();
        
        return {
            totalCases,
            activeCases,
            reservedCases,
            finishedCases,
            totalClients: await db.clients.count(),
            totalFees,
            totalPaid,
            totalRemaining,
            totalExpenses,
            netIncome: totalPaid - totalExpenses,
            todaySessions,
            pendingTasks
        };
    },
    
    // ========== الإعدادات ==========
    getSettings: async () => {
        const settings = await db.settings.toArray();
        const settingsObj = {};
        settings.forEach(s => settingsObj[s.key] = s.value);
        return settingsObj;
    },
    saveSetting: async (key, value) => {
        const existing = await db.settings.where('key').equals(key).first();
        if (existing) {
            await db.settings.update(existing.id, { value });
        } else {
            await db.settings.add({ key, value });
        }
    },
    
    // ========== النسخ الاحتياطي ==========
    backup: async () => {
        const backup = {
            clients: await db.clients.toArray(),
            cases: await db.cases.toArray(),
            sessions: await db.sessions.toArray(),
            documents: await db.documents.toArray(),
            expenses: await db.expenses.toArray(),
            invoices: await db.invoices.toArray(),
            tasks: await db.tasks.toArray(),
            backupDate: new Date()
        };
        
        const backupJson = JSON.stringify(backup, null, 2);
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lawfirm_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    },
    
    restore: async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    if (backup.clients) await db.clients.bulkPut(backup.clients);
                    if (backup.cases) await db.cases.bulkPut(backup.cases);
                    if (backup.sessions) await db.sessions.bulkPut(backup.sessions);
                    if (backup.documents) await db.documents.bulkPut(backup.documents);
                    if (backup.expenses) await db.expenses.bulkPut(backup.expenses);
                    if (backup.invoices) await db.invoices.bulkPut(backup.invoices);
                    if (backup.tasks) await db.tasks.bulkPut(backup.tasks);
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    },

    // ========== البيانات الوهمية ==========
    addDemoData: async () => {
        // التحقق من وجود بيانات مسبقة لتجنب التكرار
        const existingClients = await db.clients.count();
        if (existingClients > 0) {
            if (!confirm('يوجد بيانات حالياً. إضافة البيانات الوهمية ستضيفها مع البيانات الموجودة. هل تريد المتابعة؟')) {
                return false;
            }
        }
        
        // موكلين وهميين
        const demoClients = [
            { name: 'أحمد محمد علي', phone: '01001234567', email: 'ahmed@example.com', nationalId: '29901011234567', address: 'القاهرة - مدينة نصر', notes: 'عميل قديم', createdAt: new Date(), updatedAt: new Date() },
            { name: 'سارة خالد محمود', phone: '01102345678', email: 'sara@example.com', nationalId: '29902022345678', address: 'الجيزة - المهندسين', notes: 'قضية طلاق', createdAt: new Date(), updatedAt: new Date() },
            { name: 'محمد إبراهيم حسن', phone: '01203456789', email: 'mohamed@example.com', nationalId: '29903033456789', address: 'الإسكندرية - سيدي جابر', notes: 'قضية تجارية', createdAt: new Date(), updatedAt: new Date() },
            { name: 'نورا أحمد سعيد', phone: '01504567890', email: 'nora@example.com', nationalId: '29904044567890', address: 'القاهرة - المعادي', notes: 'قضية إيجار', createdAt: new Date(), updatedAt: new Date() },
            { name: 'خالد يوسف عبدالله', phone: '01005678901', email: 'khaled@example.com', nationalId: '29905055678901', address: 'الجيزة - الشيخ زايد', notes: 'شركة', createdAt: new Date(), updatedAt: new Date() }
        ];
        
        const clientIds = [];
        for (const client of demoClients) {
            const id = await db.clients.add(client);
            clientIds.push(id);
        }
        
        // قضايا وهمية
        const demoCases = [
            { caseNumber: 'ق/2025/1', title: 'قضية مخالفة عقد', clientId: clientIds[0], opponent: 'شركة النيل', opponentLawyer: 'محمد جلال', caseType: 'تجاري', status: 'متداولة', court: 'محكمة القاهرة الاقتصادية', circuit: 'الدائرة الأولى', fees: 50000, paidAmount: 20000, subject: 'مخالفة شروط العقد المبرم بين الطرفين بتاريخ 2024-01-15', createdAt: new Date(), updatedAt: new Date() },
            { caseNumber: 'ق/2025/2', title: 'قضية طلاق', clientId: clientIds[1], opponent: 'عمر محمود', opponentLawyer: 'نهى سامي', caseType: 'أسرة', status: 'متداولة', court: 'محكمة الأسرة بالجيزة', circuit: 'الدائرة الثانية', fees: 30000, paidAmount: 15000, subject: 'طلب خلع وإنهاء الزواج', createdAt: new Date(), updatedAt: new Date() },
            { caseNumber: 'ق/2025/3', title: 'قضية سرقة', clientId: clientIds[2], opponent: 'مجهول', opponentLawyer: 'النيابة العامة', caseType: 'جنائي', status: 'محجوزة للحكم', court: 'محكمة جنح الإسكندرية', circuit: 'الدائرة الثالثة', fees: 25000, paidAmount: 25000, subject: 'واقعة سرقة محل تجاري', createdAt: new Date(), updatedAt: new Date() },
            { caseNumber: 'ق/2025/4', title: 'نزاع إيجار', clientId: clientIds[3], opponent: 'محمود فهمي', opponentLawyer: 'أحمد رشدي', caseType: 'مدني', status: 'متداولة', court: 'محكمة المعادي الجزئية', circuit: 'الدائرة الرابعة', fees: 20000, paidAmount: 5000, subject: 'عدم سداد الإيجار المستحق', createdAt: new Date(), updatedAt: new Date() },
            { caseNumber: 'ق/2025/5', title: 'قضية تعويض', clientId: clientIds[4], opponent: 'شركة الأهرام', opponentLawyer: 'عادل مصطفى', caseType: 'تجاري', status: 'منتهية', court: 'محكمة شمال القاهرة', circuit: 'الدائرة الخامسة', fees: 100000, paidAmount: 100000, subject: 'مطالبة بتعويض عن أضرار مادية', createdAt: new Date(), updatedAt: new Date() }
        ];
        
        const caseIds = [];
        for (const case_ of demoCases) {
            const id = await db.cases.add(case_);
            caseIds.push(id);
        }
        
        // جلسات وهمية
        const demoSessions = [
            { caseId: caseIds[0], sessionDate: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0], sessionTime: '10:30', decision: '', nextSessionDate: '', notes: 'جلسة المرافعة الأولى', createdAt: new Date() },
            { caseId: caseIds[0], sessionDate: new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0], sessionTime: '11:00', decision: 'تأجيل لجلسة قادمة', nextSessionDate: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0], notes: 'طلب الخصم تأجيل', createdAt: new Date() },
            { caseId: caseIds[1], sessionDate: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0], sessionTime: '12:00', decision: '', nextSessionDate: '', notes: 'جلسة صلح', createdAt: new Date() },
            { caseId: caseIds[2], sessionDate: new Date(Date.now() - 3*24*60*60*1000).toISOString().split('T')[0], sessionTime: '09:30', decision: 'حكم براءة', nextSessionDate: '', notes: 'صدر الحكم', createdAt: new Date() },
            { caseId: caseIds[3], sessionDate: new Date(Date.now() + 10*24*60*60*1000).toISOString().split('T')[0], sessionTime: '13:00', decision: '', nextSessionDate: '', notes: 'جلسة عاجلة', createdAt: new Date() }
        ];
        
        for (const session of demoSessions) {
            await db.sessions.add(session);
        }
        
        // مستندات وهمية
        const demoDocuments = [
            { caseId: caseIds[0], docType: 'توكيل', docName: 'توكيل قضائي', fileType: 'application/pdf', docData: '', notes: 'توكيل رسمي من العميل', uploadDate: new Date() },
            { caseId: caseIds[1], docType: 'عقد', docName: 'عقد زواج', fileType: 'application/pdf', docData: '', notes: 'صورة عقد الزواج', uploadDate: new Date() },
            { caseId: caseIds[2], docType: 'محضر شرطة', docName: 'محضر سرقة', fileType: 'application/pdf', docData: '', notes: 'محضر قسم الشرطة', uploadDate: new Date() },
            { caseId: caseIds[4], docType: 'حكم', docName: 'صورة الحكم', fileType: 'application/pdf', docData: '', notes: 'الحكم النهائي', uploadDate: new Date() }
        ];
        
        for (const doc of demoDocuments) {
            await db.documents.add(doc);
        }
        
        // مصروفات وهمية
        const demoExpenses = [
            { caseId: caseIds[0], expenseType: 'رسوم محكمة', amount: 5000, description: 'رسوم رفع الدعوى', expenseDate: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0] },
            { caseId: caseIds[0], expenseType: 'أتعاب خبير', amount: 3000, description: 'أتعاب خبير فني', expenseDate: new Date(Date.now() - 15*24*60*60*1000).toISOString().split('T')[0] },
            { caseId: caseIds[1], expenseType: 'رسوم محكمة', amount: 2000, description: 'رسوم دعوى خلع', expenseDate: new Date(Date.now() - 20*24*60*60*1000).toISOString().split('T')[0] },
            { caseId: caseIds[3], expenseType: 'مصاريف إعلان', amount: 1500, description: 'إعلان الخصم', expenseDate: new Date(Date.now() - 5*24*60*60*1000).toISOString().split('T')[0] }
        ];
        
        for (const expense of demoExpenses) {
            await db.expenses.add(expense);
        }
        
        // فواتير وهمية
        const demoInvoices = [
            { clientId: clientIds[0], caseId: caseIds[0], invoiceNumber: 'INV-00001', amount: 20000, paidAmount: 20000, remainingAmount: 0, status: 'مدفوعة', issueDate: new Date(Date.now() - 45*24*60*60*1000).toISOString().split('T')[0], dueDate: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0], notes: 'دفعة أولى' },
            { clientId: clientIds[0], caseId: caseIds[0], invoiceNumber: 'INV-00002', amount: 30000, paidAmount: 0, remainingAmount: 30000, status: 'غير مدفوعة', issueDate: new Date(Date.now() - 15*24*60*60*1000).toISOString().split('T')[0], dueDate: new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0], notes: 'الدفعة الثانية' },
            { clientId: clientIds[1], caseId: caseIds[1], invoiceNumber: 'INV-00003', amount: 15000, paidAmount: 15000, remainingAmount: 0, status: 'مدفوعة', issueDate: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0], dueDate: new Date(Date.now() - 15*24*60*60*1000).toISOString().split('T')[0], notes: 'أتعاب المحاماة' }
        ];
        
        for (const invoice of demoInvoices) {
            await db.invoices.add(invoice);
        }
        
        // مهام وهمية
        const demoTasks = [
            { title: 'الاستعداد لجلسة القضية رقم 1', description: 'مراجعة المذكرات وتجهيز المرافعة', caseId: caseIds[0], priority: 'عالية', status: 'pending', dueDate: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0], createdAt: new Date() },
            { title: 'مقابلة العميلة سارة', description: 'مناقشة مستجدات القضية', caseId: caseIds[1], priority: 'متوسطة', status: 'pending', dueDate: new Date(Date.now() + 1*24*60*60*1000).toISOString().split('T')[0], createdAt: new Date() },
            { title: 'تقديم مذكرة لقضية التعويض', description: 'إعداد المذكرة الختامية', caseId: caseIds[4], priority: 'عالية', status: 'completed', dueDate: new Date(Date.now() - 5*24*60*60*1000).toISOString().split('T')[0], createdAt: new Date(), completedAt: new Date(Date.now() - 3*24*60*60*1000) },
            { title: 'دفع رسوم التجديد', description: 'تجديد صحيفة الدعوى', caseId: caseIds[3], priority: 'متوسطة', status: 'pending', dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0], createdAt: new Date() }
        ];
        
        for (const task of demoTasks) {
            await db.tasks.add(task);
        }
        
        return true;
    },

    deleteAllDemoData: async () => {
        if (!confirm('⚠️ تحذير: سيتم حذف جميع البيانات الحالية. هل أنت متأكد؟')) {
            return false;
        }
        
        await db.clients.clear();
        await db.cases.clear();
        await db.sessions.clear();
        await db.documents.clear();
        await db.expenses.clear();
        await db.invoices.clear();
        await db.tasks.clear();
        
        // إعادة إضافة النماذج الافتراضية
        await db.templates.bulkAdd([
            { name: 'عقد بيع', type: 'sale', category: 'عقود', content: getTemplateContent('sale'), createdAt: new Date() },
            { name: 'عقد إيجار', type: 'rent', category: 'عقود', content: getTemplateContent('rent'), createdAt: new Date() },
            { name: 'توكيل عام', type: 'power_of_attorney', category: 'توكيلات', content: getTemplateContent('power_of_attorney'), createdAt: new Date() },
            { name: 'عريضة دعوى', type: 'lawsuit', category: 'دعاوى', content: getTemplateContent('lawsuit'), createdAt: new Date() }
        ]);
        
        return true;
    }
};

// تفعيل الإشعارات
if ("Notification" in window) {
    Notification.requestPermission();
}

// فحص التنبيهات اليومية
setInterval(async () => {
    const settings = await DB.getSettings();
    if (settings.notificationEnabled === 'true') {
        const today = new Date().toISOString().split('T')[0];
        const sessions = await db.sessions.where('sessionDate').equals(today).toArray();
        const cases = await db.cases.toArray();
        
        sessions.forEach(session => {
            const case_ = cases.find(c => c.id == session.caseId);
            if (Notification.permission === "granted") {
                new Notification("📅 تذكير بجلسة قضائية", {
                    body: `لديك جلسة اليوم: ${case_?.title || 'قضية غير معروفة'}\nالساعة: ${session.sessionTime || 'غير محدد'}`,
                    icon: "https://cdn-icons-png.flaticon.com/512/190/190411.png"
                });
            }
        });
    }
}, 3600000);

// ========== التحميل التلقائي للبيانات التجريبية ==========
(async function autoLoadDemoOnFirstUse() {
    // ننتظر قليلاً للتأكد من أن Dexie جاهز
    await new Promise(resolve => setTimeout(resolve, 200));
    
    try {
        const clientCount = await db.clients.count();
        const caseCount = await db.cases.count();
        
        console.log(`📊 فحص قاعدة البيانات: ${clientCount} موكل, ${caseCount} قضية`);
        
        // إذا كانت فارغة تماماً
        if (clientCount === 0 && caseCount === 0) {
            console.log("🔄 قاعدة البيانات فارغة - جاري إضافة البيانات التجريبية...");
            
            // إضافة البيانات
            const result = await DB.addDemoData();
            
            if (result) {
                console.log("✅ تمت إضافة البيانات التجريبية بنجاح!");
                
                // إظهار إشعار للمستخدم
                setTimeout(() => {
                    if (typeof alert === 'function') {
                        alert("🎉 مرحباً بك في نظام إدارة المحاماة!\n\nتم إضافة بيانات تجريبية لتجربة النظام. يمكنك تعديلها أو حذفها في أي وقت.");
                    }
                }, 1000);
            }
        } else {
            console.log("✅ البيانات موجودة مسبقاً، لا حاجة للإضافة التلقائية");
        }
    } catch (error) {
        console.error("❌ خطأ في التحميل التلقائي:", error);
    }
})();
