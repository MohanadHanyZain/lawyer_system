// app.js - التطبيق الرئيسي المتكامل (بدون نظام مستخدمين)

const content = document.getElementById('main-content');
const title = document.getElementById('page-title');
let currentEditId = null;
let currentCaseId = null;

// دوال مساعدة آمنة للتشفير
function safeBtoa(str) {
    if (!str) return '';
    return btoa(unescape(encodeURIComponent(str)));
}

function safeAtob(str) {
    if (!str) return '';
    return decodeURIComponent(escape(atob(str)));
}

// تهيئة التطبيق
async function init() {
    updateDateTime();
    router('dashboard');
}

function updateDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('current-date').innerHTML = dateStr;
    setInterval(() => {
        const now2 = new Date();
        document.getElementById('current-date').innerHTML = now2.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    }, 60000);
}

async function router(page) {
    if (page === 'dashboard') await renderDashboard();
    if (page === 'cases') await renderCases();
    if (page === 'clients') await renderClients();
    if (page === 'calendar') await renderCalendar();
    if (page === 'finance') await renderFinance();
    if (page === 'templates') await renderTemplates();
    if (page === 'tasks') await renderTasks();
    if (page === 'settings') await renderSettings();
}

function toggleModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.toggle('hidden');
        if (modal.classList.contains('hidden')) {
            currentEditId = null;
        }
    }
}

// ========== لوحة التحكم ==========
async function renderDashboard() {
    title.innerText = 'لوحة التحكم';
    const s = await DB.getStats();
    const todaySessions = await DB.getTodaySessions();
    const pendingTasks = await DB.getAllTasks();
    const pendingTasksFiltered = pendingTasks.filter(t => t.status === 'pending');
    
    content.innerHTML = `
        <div class="space-y-6">
            <!-- بطاقات الإحصائيات -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
                    <p class="text-blue-100 text-sm">إجمالي القضايا</p>
                    <p class="text-3xl font-bold mt-2">${s.totalCases}</p>
                    <div class="mt-2 text-blue-100 text-xs">نشطة: ${s.activeCases}</div>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
                    <p class="text-green-100 text-sm">المبالغ المستحقة</p>
                    <p class="text-3xl font-bold mt-2">${s.totalRemaining.toLocaleString()} ج.م</p>
                    <div class="mt-2 text-green-100 text-xs">مدفوع: ${s.totalPaid.toLocaleString()}</div>
                </div>
                <div class="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
                    <p class="text-purple-100 text-sm">جلسات اليوم</p>
                    <p class="text-3xl font-bold mt-2">${s.todaySessions}</p>
                    <div class="mt-2 text-purple-100 text-xs">مهام معلقة: ${s.pendingTasks}</div>
                </div>
                <div class="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-lg">
                    <p class="text-orange-100 text-sm">الموكلين</p>
                    <p class="text-3xl font-bold mt-2">${s.totalClients}</p>
                </div>
            </div>
            
            <!-- جلسات اليوم -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">📅 جلسات اليوم</h3>
                    <button onclick="router('calendar')" class="text-blue-600 text-sm">عرض الكل →</button>
                </div>
                ${todaySessions.length > 0 ? todaySessions.map(s => `
                    <div class="flex justify-between items-center p-4 bg-blue-50 rounded-lg mb-2 border-r-4 border-blue-600">
                        <div>
                            <p class="font-bold">${s.caseTitle}</p>
                            <p class="text-sm text-gray-600">⏰ ${s.sessionTime || 'غير محدد'}</p>
                        </div>
                        <button onclick="viewCaseDetails(${s.caseId})" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">عرض</button>
                    </div>
                `).join('') : '<p class="text-gray-500 text-center py-8">🎉 لا توجد جلسات اليوم</p>'}
            </div>
            
            <!-- المهام المعلقة -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">✅ المهام المعلقة</h3>
                    <button onclick="router('tasks')" class="text-blue-600 text-sm">عرض الكل →</button>
                </div>
                ${pendingTasksFiltered.length > 0 ? pendingTasksFiltered.slice(0, 5).map(t => `
                    <div class="flex justify-between items-center p-3 bg-yellow-50 rounded-lg mb-2">
                        <div>
                            <p class="font-bold">${t.title}</p>
                            <p class="text-xs text-gray-500">لـ: ${t.assignedToName || 'المكتب'} | ${t.caseTitle}</p>
                        </div>
                        <input type="checkbox" onchange="completeTask(${t.id}, this.checked)" class="w-5 h-5">
                    </div>
                `).join('') : '<p class="text-gray-500 text-center py-4">✨ لا توجد مهام معلقة</p>'}
            </div>
        </div>
    `;
}

// ========== إدارة الموكلين ==========
async function renderClients() {
    title.innerText = 'إدارة الموكلين';
    const data = await DB.getAllClients();
    
    content.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <button onclick="toggleModal('m-client')" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">+ موكل جديد</button>
                <div class="flex gap-2">
                    <input type="text" id="search-client" placeholder="🔍 بحث بالاسم أو الهاتف..." class="border p-2 rounded-lg w-64" onkeyup="searchClients()">
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="clients-list">
                ${data.map(cl => `
                    <div class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
                        <div class="flex justify-between items-start mb-4">
                            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span class="text-blue-600 font-bold text-xl">${cl.name.charAt(0)}</span>
                            </div>
                            <div class="flex gap-2">
                                <button onclick='editClient(${JSON.stringify(cl)})' class="text-blue-600 hover:text-blue-800">✏️</button>
                                <button onclick="delClient(${cl.id})" class="text-red-500 hover:text-red-700">🗑️</button>
                            </div>
                        </div>
                        <h3 class="font-bold text-lg mb-2">${cl.name}</h3>
                        <p class="text-gray-600 text-sm mb-1">📞 ${cl.phone}</p>
                        <p class="text-gray-600 text-sm mb-1">🆔 ${cl.nationalId || 'غير مسجل'}</p>
                        <p class="text-gray-600 text-sm">📍 ${cl.address || 'غير مسجل'}</p>
                        <button onclick="viewClientDetails(${cl.id})" class="mt-4 text-blue-600 text-sm w-full py-2 border-t border-gray-200 pt-3">📂 عرض الملف الكامل ←</button>
                    </div>
                `).join('')}
            </div>
        </div>

        <div id="m-client" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div class="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <h3 class="font-bold text-xl mb-4 border-b pb-2">📋 بيانات الموكل</h3>
                <input id="cl-name" placeholder="الاسم الكامل" class="w-full border p-3 rounded mb-3 outline-none focus:border-blue-500">
                <input id="cl-phone" placeholder="رقم الهاتف" class="w-full border p-3 rounded mb-3 outline-none focus:border-blue-500">
                <input id="cl-email" placeholder="البريد الإلكتروني" class="w-full border p-3 rounded mb-3 outline-none focus:border-blue-500">
                <input id="cl-national" placeholder="الرقم القومي" class="w-full border p-3 rounded mb-3 outline-none focus:border-blue-500">
                <textarea id="cl-address" placeholder="العنوان" class="w-full border p-3 rounded mb-4 outline-none focus:border-blue-500" rows="3"></textarea>
                <button onclick="handleSaveClient()" class="bg-green-600 text-white w-full py-3 rounded-lg font-bold hover:bg-green-700">حفظ</button>
                <button onclick="toggleModal('m-client')" class="w-full mt-2 text-gray-400 hover:text-gray-600">إلغاء</button>
            </div>
        </div>`;
}

async function searchClients() {
    const keyword = document.getElementById('search-client').value;
    const clients = keyword ? await DB.searchClients(keyword) : await DB.getAllClients();
    const container = document.getElementById('clients-list');
    if (container) {
        container.innerHTML = clients.map(cl => `
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span class="text-blue-600 font-bold text-xl">${cl.name.charAt(0)}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick='editClient(${JSON.stringify(cl)})' class="text-blue-600">✏️</button>
                        <button onclick="delClient(${cl.id})" class="text-red-500">🗑️</button>
                    </div>
                </div>
                <h3 class="font-bold text-lg mb-2">${cl.name}</h3>
                <p class="text-gray-600 text-sm">📞 ${cl.phone}</p>
                <button onclick="viewClientDetails(${cl.id})" class="mt-4 text-blue-600 text-sm w-full py-2 border-t pt-3">📂 عرض الملف ←</button>
            </div>
        `).join('');
    }
}

async function viewClientDetails(clientId) {
    const client = await DB.getClientById(clientId);
    const cases = await DB.getCasesByClient(clientId);
    const documents = await DB.getDocumentsByClient(clientId);
    
    content.innerHTML = `
        <div class="space-y-6">
            <button onclick="router('clients')" class="text-blue-600 mb-4">← العودة</button>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-2xl font-bold">${client.name}</h2>
                        <p class="text-gray-500">${client.nationalId || 'رقم قومي غير مسجل'}</p>
                    </div>
                    <button onclick="editClient(${JSON.stringify(client)})" class="bg-blue-600 text-white px-4 py-2 rounded">تعديل</button>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><p class="text-gray-500">📞 الهاتف</p><p class="font-semibold">${client.phone}</p></div>
                    <div><p class="text-gray-500">✉️ البريد</p><p class="font-semibold">${client.email || '-'}</p></div>
                    <div class="col-span-2"><p class="text-gray-500">📍 العنوان</p><p class="font-semibold">${client.address || '-'}</p></div>
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">⚖️ قضايا ${client.name}</h3>
                ${cases.length > 0 ? cases.map(c => `
                    <div class="border-b pb-3 mb-3">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-blue-600">${c.caseNumber}</p>
                                <p>${c.title}</p>
                                <p class="text-sm text-gray-500">الحالة: ${c.status}</p>
                            </div>
                            <button onclick="viewCaseDetails(${c.id})" class="text-green-600">عرض القضية →</button>
                        </div>
                    </div>
                `).join('') : '<p class="text-gray-500">لا توجد قضايا مسجلة لهذا الموكل</p>'}
                <button onclick="openNewCaseForClient(${client.id})" class="mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm">+ إضافة قضية</button>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">📄 مستندات ${client.name}</h3>
                ${documents.length > 0 ? documents.map(d => `
                    <div class="border-b pb-2 mb-2">${d.docName} - ${new Date(d.uploadDate).toLocaleDateString()}</div>
                `).join('') : '<p class="text-gray-500">لا توجد مستندات</p>'}
            </div>
        </div>
    `;
}

// ========== إدارة القضايا ==========
async function renderCases() {
    title.innerText = 'إدارة القضايا';
    const cases = await DB.getAllCases();
    const clients = await DB.getAllClients();
    const stats = await DB.getStats();
    
    content.innerHTML = `
        <div class="space-y-6">
            <!-- إحصائيات سريعة -->
            <div class="grid grid-cols-4 gap-4">
                <div class="bg-blue-100 p-4 rounded-xl text-center"><p class="text-2xl font-bold text-blue-600">${stats.activeCases}</p><p class="text-gray-600 text-sm">متداولة</p></div>
                <div class="bg-yellow-100 p-4 rounded-xl text-center"><p class="text-2xl font-bold text-yellow-600">${stats.reservedCases}</p><p class="text-gray-600 text-sm">محجوزة</p></div>
                <div class="bg-green-100 p-4 rounded-xl text-center"><p class="text-2xl font-bold text-green-600">${stats.finishedCases}</p><p class="text-gray-600 text-sm">منتهية</p></div>
                <div class="bg-purple-100 p-4 rounded-xl text-center"><p class="text-2xl font-bold text-purple-600">${stats.totalRemaining.toLocaleString()}</p><p class="text-gray-600 text-sm">مستحقات</p></div>
            </div>
            
            <div class="flex justify-between items-center">
                <button onclick="toggleModal('m-case')" class="bg-blue-600 text-white px-6 py-2 rounded-lg">+ قضية جديدة</button>
                <input type="text" id="search-case" placeholder="🔍 بحث برقم القضية أو الاسم..." class="border p-2 rounded-lg w-80" onkeyup="searchCases()">
            </div>
            
            <div class="bg-white rounded-xl shadow overflow-x-auto">
                <table class="w-full text-right border-collapse">
                    <thead class="bg-gray-50 border-b">
                        <tr><th class="p-4">رقم القضية</th><th class="p-4">العنوان</th><th class="p-4">الموكل</th><th class="p-4">الخصم</th><th class="p-4">النوع</th><th class="p-4">الحالة</th><th class="p-4">المتبقي</th><th class="p-4"></th></tr>
                    </thead>
                    <tbody id="cases-table-body">
                        ${cases.map(c => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="p-4 font-bold text-blue-600">${c.caseNumber}</td>
                                <td class="p-4">${c.title}</td>
                                <td class="p-4">${c.clientName}</td>
                                <td class="p-4 text-red-500">${c.opponent || '-'}</td>
                                <td class="p-4"><span class="px-2 py-1 rounded text-xs bg-gray-100">${c.caseType}</span></td>
                                <td class="p-4">
                                    <select onchange="updateCaseStatus(${c.id}, this.value)" class="border rounded px-2 py-1 text-sm">
                                        <option ${c.status === 'متداولة' ? 'selected' : ''}>متداولة</option>
                                        <option ${c.status === 'محجوزة للحكم' ? 'selected' : ''}>محجوزة للحكم</option>
                                        <option ${c.status === 'منتهية' ? 'selected' : ''}>منتهية</option>
                                    </select>
                                </td>
                                <td class="p-4 text-red-600">${c.remainingAmount?.toLocaleString() || 0} ج.م</td>
                                <td class="p-4"><button onclick="viewCaseDetails(${c.id})" class="text-green-600">عرض التفاصيل</button></td>
                               </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="m-case" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div class="bg-white rounded-xl w-full max-w-2xl shadow-2xl my-8">
                <div class="sticky top-0 bg-white rounded-t-xl p-6 pb-3 border-b z-10">
                    <h3 class="font-bold text-xl text-blue-600">⚖️ تفاصيل القضية</h3>
                    <p class="text-sm text-gray-500 mt-1">يرجى إدخال جميع بيانات القضية بدقة</p>
                </div>
                <div class="p-6 pt-4">
                    <div class="grid grid-cols-2 gap-4">
                        <input id="c-num" placeholder="رقم القضية" class="border p-3 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <input id="c-tit" placeholder="عنوان القضية" class="border p-3 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <input id="c-opp" placeholder="اسم الخصم" class="border p-3 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <input id="c-opp-lawyer" placeholder="محامي الخصم" class="border p-3 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <input id="c-court" placeholder="اسم المحكمة" class="border p-3 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <input id="c-circuit" placeholder="الدائرة" class="border p-3 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <input id="c-fees" type="number" placeholder="إجمالي الأتعاب" class="border p-3 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <select id="c-type" class="border p-3 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="مدني">مدني</option>
                            <option value="جنائي">جنائي</option>
                            <option value="أسرة">أسرة</option>
                            <option value="تجاري">تجاري</option>
                            <option value="عمالي">عمالي</option>
                        </select>
                        <select id="c-status" class="border p-3 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="متداولة">متداولة</option>
                            <option value="محجوزة للحكم">محجوزة للحكم</option>
                            <option value="منتهية">منتهية</option>
                        </select>
                        <textarea id="c-subject" placeholder="موضوع الدعوى" class="border p-3 rounded outline-none col-span-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" rows="3"></textarea>
                        <select id="c-client" class="border p-3 rounded outline-none col-span-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="">اختر الموكل...</option>
                            ${clients.map(cl => `<option value="${cl.id}">${cl.name}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="handleSaveCase()" class="bg-blue-600 text-white w-full py-3 rounded-lg font-bold mt-6 hover:bg-blue-700 transition">💾 حفظ القضية</button>
                    <button onclick="toggleModal('m-case')" class="w-full mt-2 text-gray-400 hover:text-gray-600 transition">إلغاء</button>
                </div>
            </div>
        </div>
    `;
}

async function searchCases() {
    const keyword = document.getElementById('search-case').value;
    const cases = keyword ? await DB.searchCases(keyword) : await DB.getAllCases();
    const tbody = document.getElementById('cases-table-body');
    if (tbody) {
        tbody.innerHTML = cases.map(c => `
            <tr class="border-t hover:bg-gray-50">
                <td class="p-4 font-bold text-blue-600">${c.caseNumber}</td>
                <td class="p-4">${c.title}</td>
                <td class="p-4">${c.clientName}</td>
                <td class="p-4 text-red-500">${c.opponent || '-'}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs bg-gray-100">${c.caseType}</span></td>
                <td class="p-4">
                    <select onchange="updateCaseStatus(${c.id}, this.value)" class="border rounded px-2 py-1 text-sm">
                        <option ${c.status === 'متداولة' ? 'selected' : ''}>متداولة</option>
                        <option ${c.status === 'محجوزة للحكم' ? 'selected' : ''}>محجوزة للحكم</option>
                        <option ${c.status === 'منتهية' ? 'selected' : ''}>منتهية</option>
                    </select>
                </td>
                <td class="p-4 text-red-600">${c.remainingAmount?.toLocaleString() || 0} ج.م</td>
                <td class="p-4"><button onclick="viewCaseDetails(${c.id})" class="text-green-600">عرض التفاصيل</button></td>
               </tr>
        `).join('');
    }
}

async function viewCaseDetails(caseId) {
    currentCaseId = caseId;
    const case_ = (await DB.getAllCases()).find(c => c.id == caseId);
    const sessions = await DB.getAllSessions();
    const caseSessions = sessions.filter(s => s.caseId == caseId);
    const documents = await DB.getDocumentsByCase(caseId);
    const expenses = await DB.getExpensesByCase(caseId);
    const tasks = await DB.getAllTasks();
    const caseTasks = tasks.filter(t => t.caseId == caseId);
    
    content.innerHTML = `
        <div class="space-y-6">
            <button onclick="router('cases')" class="text-blue-600 mb-4">← العودة</button>
            
            <!-- معلومات القضية -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-2xl font-bold">${case_.title}</h2>
                        <p class="text-gray-500">رقم القضية: ${case_.caseNumber} | الدائرة: ${case_.circuit || '-'} | المحكمة: ${case_.court || '-'}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openSessionModal(${caseId})" class="bg-purple-600 text-white px-4 py-2 rounded text-sm">+ جلسة</button>
                        <button onclick="openDocumentModal(${caseId})" class="bg-indigo-600 text-white px-4 py-2 rounded text-sm">📄 مستند</button>
                        <button onclick="openTaskModal(${caseId})" class="bg-orange-600 text-white px-4 py-2 rounded text-sm">✅ مهمة</button>
                        <button onclick="openPaymentModal(${caseId})" class="bg-green-600 text-white px-4 py-2 rounded text-sm">💰 دفعة</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p class="text-gray-500">الموكل</p><p class="font-semibold">${case_.clientName}</p></div>
                    <div><p class="text-gray-500">الخصم</p><p class="font-semibold">${case_.opponent || '-'}</p></div>
                    <div><p class="text-gray-500">محامي الخصم</p><p class="font-semibold">${case_.opponentLawyer || '-'}</p></div>
                    <div><p class="text-gray-500">نوع القضية</p><p class="font-semibold">${case_.caseType}</p></div>
                    <div><p class="text-gray-500">الحالة</p><span class="px-2 py-1 rounded text-xs ${case_.status === 'متداولة' ? 'bg-yellow-100 text-yellow-700' : case_.status === 'محجوزة للحكم' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}">${case_.status}</span></div>
                    <div><p class="text-gray-500">إجمالي الأتعاب</p><p class="font-bold text-lg">${case_.fees?.toLocaleString() || 0} ج.م</p></div>
                    <div><p class="text-gray-500">المدفوع</p><p class="font-bold text-green-600">${case_.paidAmount?.toLocaleString() || 0} ج.م</p></div>
                    <div><p class="text-gray-500">المتبقي</p><p class="font-bold text-red-600">${case_.remainingAmount?.toLocaleString() || 0} ج.م</p></div>
                    <div class="col-span-4"><p class="text-gray-500">موضوع الدعوى</p><p class="font-semibold">${case_.subject || '-'}</p></div>
                </div>
            </div>
            
            <!-- الجلسات -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">📅 الجلسات والقرارات</h3>
                ${caseSessions.length > 0 ? caseSessions.map(s => `
                    <div class="border rounded-lg p-4 mb-3">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-bold text-blue-600">📆 ${s.sessionDate} ${s.sessionTime ? '| ⏰ ' + s.sessionTime : ''}</p>
                                ${s.decision ? `<p class="mt-2 text-sm">📝 القرار: ${s.decision}</p>` : ''}
                                ${s.nextSessionDate ? `<p class="mt-2 text-sm text-purple-600">⏩ الجلسة القادمة: ${s.nextSessionDate} ${s.nextSessionTime || ''}</p>` : ''}
                                ${s.notes ? `<p class="mt-1 text-xs text-gray-500">ملاحظات: ${s.notes}</p>` : ''}
                            </div>
                            <button onclick="deleteSession(${s.id})" class="text-red-400 text-sm">🗑️</button>
                        </div>
                    </div>
                `).join('') : '<p class="text-gray-500">لا توجد جلسات مسجلة</p>'}
            </div>
            
            <!-- المهام -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">✅ المهام المتعلقة</h3>
                ${caseTasks.length > 0 ? caseTasks.map(t => `
                    <div class="flex justify-between items-center p-3 border-b">
                        <div>
                            <p class="font-bold">${t.title}</p>
                            <p class="text-xs text-gray-500">مسندة إلى: ${t.assignedToName || 'المكتب'} | تاريخ الاستحقاق: ${t.dueDate || '-'}</p>
                        </div>
                        <div class="flex gap-2">
                            <span class="px-2 py-1 rounded text-xs ${t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}">${t.status === 'pending' ? 'قيد الانتظار' : 'مكتملة'}</span>
                            ${t.status === 'pending' ? `<input type="checkbox" onchange="completeTask(${t.id}, this.checked)" class="w-5 h-5">` : ''}
                        </div>
                    </div>
                `).join('') : '<p class="text-gray-500">لا توجد مهام</p>'}
            </div>
            
            <!-- المستندات -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">📄 المستندات</h3>
                ${documents.length > 0 ? `
                    <div class="grid grid-cols-2 gap-3">
                        ${documents.map(d => `
                            <div class="border rounded p-3 flex justify-between items-center">
                                <div>
                                    <p class="font-semibold">${d.docName}</p>
                                    <p class="text-xs text-gray-500">${d.docType} | ${new Date(d.uploadDate).toLocaleDateString()}</p>
                                </div>
                                <button onclick="viewDocument(${d.id})" class="text-blue-600 text-sm">👁️</button>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-gray-500">لا توجد مستندات</p>'}
            </div>
        </div>
    `;
}

// ========== الأجندة والجلسات ==========
async function renderCalendar() {
    title.innerText = 'الأجندة والمواعيد';
    const todaySessions = await DB.getTodaySessions();
    const upcomingSessions = await DB.getUpcomingSessions();
    
    content.innerHTML = `
        <div class="space-y-6">
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-2xl">
                <h3 class="text-2xl font-bold mb-2">📅 جلسات اليوم</h3>
                <p>${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                ${todaySessions.length > 0 ? todaySessions.map(s => `
                    <div class="flex justify-between items-center p-4 bg-blue-50 rounded-lg mb-3 border-r-4 border-blue-600">
                        <div>
                            <p class="font-bold">${s.caseTitle}</p>
                            <p class="text-sm text-gray-600">⏰ ${s.sessionTime || 'غير محدد'}</p>
                            ${s.notes ? `<p class="text-xs text-gray-500 mt-1">${s.notes}</p>` : ''}
                        </div>
                        <button onclick="viewCaseDetails(${s.caseId})" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">عرض القضية</button>
                    </div>
                `).join('') : '<p class="text-gray-500 text-center py-8">🎉 لا توجد جلسات اليوم</p>'}
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">⏰ الجلسات القادمة</h3>
                ${upcomingSessions.length > 0 ? upcomingSessions.map(s => `
                    <div class="flex justify-between items-center p-4 border rounded-lg mb-2">
                        <div>
                            <p class="font-bold">${s.caseTitle}</p>
                            <p class="text-sm text-gray-600">📆 ${s.sessionDate} | ⏰ ${s.sessionTime || 'غير محدد'}</p>
                        </div>
                        <button onclick="viewCaseDetails(${s.caseId})" class="text-blue-600">عرض</button>
                    </div>
                `).join('') : '<p class="text-gray-500 text-center py-8">لا توجد جلسات قادمة</p>'}
            </div>
        </div>
    `;
}

// ========== الإدارة المالية ==========
async function renderFinance() {
    title.innerText = 'الإدارة المالية';
    const stats = await DB.getStats();
    const cases = await DB.getAllCases();
    
    content.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div class="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl">
                    <p class="text-green-100">إجمالي الأتعاب</p>
                    <p class="text-3xl font-bold">${stats.totalFees.toLocaleString()} ج.م</p>
                </div>
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl">
                    <p class="text-blue-100">المدفوع</p>
                    <p class="text-3xl font-bold">${stats.totalPaid.toLocaleString()} ج.م</p>
                </div>
                <div class="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl">
                    <p class="text-red-100">المتبقي</p>
                    <p class="text-3xl font-bold">${stats.totalRemaining.toLocaleString()} ج.م</p>
                </div>
                <div class="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl">
                    <p class="text-purple-100">صافي الدخل</p>
                    <p class="text-3xl font-bold">${stats.netIncome.toLocaleString()} ج.م</p>
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">💰 المبالغ المالية للقضايا</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50"><tr><th class="p-3">القضية</th><th>الموكل</th><th>إجمالي الأتعاب</th><th>المدفوع</th><th>المتبقي</th><th></th></tr></thead>
                        <tbody>
                            ${cases.map(c => `<tr class="border-t"><td class="p-3">${c.title}</td><td>${c.clientName}</td><td>${c.fees?.toLocaleString() || 0}</td><td class="text-green-600">${c.paidAmount?.toLocaleString() || 0}</td><td class="text-red-600">${c.remainingAmount?.toLocaleString() || 0}</td><td><button onclick="openPaymentModal(${c.id})" class="bg-green-600 text-white px-2 py-1 rounded text-sm">تسجيل دفعة</button></td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">🧾 طباعة إيصال استلام</h3>
                <div class="grid grid-cols-2 gap-4">
                    <select id="receipt-case" class="border p-3 rounded"><option value="">اختر القضية</option>${cases.map(c => `<option value="${c.id}">${c.caseNumber} - ${c.title}</option>`).join('')}</select>
                    <input type="number" id="receipt-amount" placeholder="المبلغ المستلم" class="border p-3 rounded">
                    <textarea id="receipt-notes" placeholder="ملاحظات" class="border p-3 rounded col-span-2"></textarea>
                    <button onclick="printReceipt()" class="bg-blue-600 text-white py-3 rounded col-span-2">🖨️ طباعة الإيصال</button>
                </div>
            </div>
        </div>
    `;
}

// ========== النماذج الجاهزة ==========
async function renderTemplates() {
    title.innerText = 'النماذج والعقود الجاهزة';
    const templates = await DB.getAllTemplates();
    
    content.innerHTML = `
        <div class="space-y-6">
            <button onclick="toggleModal('m-template')" class="bg-green-600 text-white px-6 py-2 rounded-lg">+ نموذج جديد</button>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${templates.map(t => `
                    <div class="bg-white rounded-2xl shadow-lg p-6">
                        <div class="flex justify-between items-start mb-4">
                            <h3 class="font-bold text-xl">${t.name}</h3>
                            <div class="flex gap-2">
                                <button onclick="useTemplate(${t.id})" class="text-green-600">📝 استخدام</button>
                                <button onclick="deleteTemplate(${t.id})" class="text-red-500">🗑️</button>
                            </div>
                        </div>
                        <p class="text-gray-500 text-sm">${t.category}</p>
                        <p class="text-gray-600 text-sm mt-2 line-clamp-3">${t.content.substring(0, 100)}...</p>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div id="m-template" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div class="bg-white p-6 rounded-xl w-full max-w-2xl">
                <h3 class="font-bold text-xl mb-4">📝 نموذج جديد</h3>
                <input id="temp-name" placeholder="اسم النموذج" class="w-full border p-3 rounded mb-3">
                <select id="temp-category" class="w-full border p-3 rounded mb-3"><option>عقود</option><option>توكيلات</option><option>دعاوى</option></select>
                <textarea id="temp-content" placeholder="محتوى النموذج..." class="w-full border p-3 rounded mb-3" rows="10"></textarea>
                <button onclick="saveTemplate()" class="bg-green-600 text-white w-full py-3 rounded">حفظ</button>
                <button onclick="toggleModal('m-template')" class="w-full mt-2 text-gray-400">إلغاء</button>
            </div>
        </div>
    `;
}

async function useTemplate(templateId) {
    const template = await DB.getTemplate(templateId);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl"><head><title>${template.name}</title><style>body{font-family:Arial;padding:40px;}</style></head>
        <body><pre style="white-space:pre-wrap">${template.content}</pre>
        <script>window.print();setTimeout(window.close,500);<\/script></body></html>
    `);
}

async function saveTemplate() {
    const data = {
        name: document.getElementById('temp-name').value,
        category: document.getElementById('temp-category').value,
        content: document.getElementById('temp-content').value,
        type: 'custom'
    };
    await DB.saveTemplate(data);
    toggleModal('m-template');
    renderTemplates();
}

async function deleteTemplate(id) {
    if (confirm('حذف النموذج؟')) {
        await DB.deleteTemplate(id);
        renderTemplates();
    }
}

// ========== إدارة المهام ==========
async function renderTasks() {
    title.innerText = 'إدارة المهام';
    const tasks = await DB.getAllTasks();
    const cases = await DB.getAllCases();
    
    content.innerHTML = `
        <div class="space-y-6">
            <button onclick="toggleModal('m-task')" class="bg-orange-600 text-white px-6 py-2 rounded-lg">+ مهمة جديدة</button>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">📋 قائمة المهام</h3>
                <div class="space-y-3">
                    ${tasks.map(t => `
                        <div class="flex justify-between items-center p-4 border rounded-lg ${t.status === 'pending' ? 'bg-yellow-50' : 'bg-green-50'}">
                            <div>
                                <p class="font-bold">${t.title}</p>
                                <p class="text-sm text-gray-600">لـ: ${t.assignedToName || 'المكتب'} | القضية: ${t.caseTitle}</p>
                                <p class="text-xs text-gray-500">تاريخ الاستحقاق: ${t.dueDate || 'غير محدد'} | الأولوية: ${t.priority || 'متوسطة'}</p>
                            </div>
                            <div class="flex gap-2">
                                ${t.status === 'pending' ? `<input type="checkbox" onchange="completeTask(${t.id}, this.checked)" class="w-5 h-5">` : '<span class="text-green-600">✓ مكتملة</span>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div id="m-task" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div class="bg-white p-6 rounded-xl w-full max-w-md">
                <h3 class="font-bold text-xl mb-4">✅ مهمة جديدة</h3>
                <input id="task-title" placeholder="عنوان المهمة" class="w-full border p-3 rounded mb-3">
                <textarea id="task-desc" placeholder="وصف المهمة" class="w-full border p-3 rounded mb-3"></textarea>
                <select id="task-case" class="w-full border p-3 rounded mb-3"><option value="">اختر القضية</option>${cases.map(c => `<option value="${c.id}">${c.caseNumber} - ${c.title}</option>`).join('')}</select>
                <input type="date" id="task-due" placeholder="تاريخ الاستحقاق" class="w-full border p-3 rounded mb-3">
                <select id="task-priority" class="w-full border p-3 rounded mb-3"><option>عالية</option><option>متوسطة</option><option>منخفضة</option></select>
                <button onclick="saveTask()" class="bg-orange-600 text-white w-full py-3 rounded">حفظ المهمة</button>
                <button onclick="toggleModal('m-task')" class="w-full mt-2 text-gray-400">إلغاء</button>
            </div>
        </div>
    `;
}

async function saveTask() {
    const data = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        assignedTo: null,
        caseId: parseInt(document.getElementById('task-case').value) || null,
        dueDate: document.getElementById('task-due').value,
        priority: document.getElementById('task-priority').value,
        status: 'pending'
    };
    await DB.saveTask(data);
    toggleModal('m-task');
    renderTasks();
}

async function completeTask(taskId, completed) {
    await DB.updateTaskStatus(taskId, completed ? 'completed' : 'pending');
    if (currentCaseId) {
        await viewCaseDetails(currentCaseId);
    } else {
        await renderTasks();
    }
}

// ========== إعدادات النظام ==========
async function renderSettings() {
    title.innerText = 'إعدادات النظام';
    const settings = await DB.getSettings();
    const stats = await DB.getStats();
    
    content.innerHTML = `
        <div class="space-y-6">
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">⚙️ إعدادات المكتب</h3>
                <div class="space-y-3">
                    <input id="set-firmName" placeholder="اسم المكتب" value="${settings.firmName || ''}" class="w-full border p-3 rounded">
                    <input id="set-phone" placeholder="رقم الهاتف" value="${settings.phone || ''}" class="w-full border p-3 rounded">
                    <input id="set-address" placeholder="العنوان" value="${settings.address || ''}" class="w-full border p-3 rounded">
                    <input id="set-taxNumber" placeholder="الرقم الضريبي" value="${settings.taxNumber || ''}" class="w-full border p-3 rounded">
                    <label class="flex items-center gap-2"><input type="checkbox" id="set-notifications" ${settings.notificationEnabled === 'true' ? 'checked' : ''}> تفعيل الإشعارات</label>
                    <button onclick="saveSettings()" class="bg-blue-600 text-white px-6 py-3 rounded w-full">💾 حفظ الإعدادات</button>
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">📊 إدارة البيانات التجريبية</h3>
                <div class="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800 mb-2">ℹ️ يمكنك إضافة بيانات وهمية لتجربة النظام، أو حذف جميع البيانات والبدء من جديد.</p>
                    <p class="text-xs text-blue-600">البيانات الحالية: ${stats.totalClients} موكل | ${stats.totalCases} قضية</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button onclick="addDemoData()" class="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition flex items-center justify-center gap-2">
                        🎲 إضافة بيانات تجريبية
                    </button>
                    <button onclick="deleteAllData()" class="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 transition flex items-center justify-center gap-2">
                        🗑️ حذف جميع البيانات
                    </button>
                </div>
                <div class="mt-3 text-xs text-gray-500 text-center">
                    ملاحظة: إضافة البيانات التجريبية ستضيف موكلين وقضايا وجلسات ومهام ومستندات وهمية
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">💾 النسخ الاحتياطي</h3>
                <button onclick="backupDatabase()" class="bg-purple-600 text-white px-6 py-3 rounded w-full mb-3">📀 عمل نسخة احتياطية</button>
                <input type="file" id="restore-file" accept=".json" class="hidden" onchange="restoreDatabase(this)">
                <button onclick="document.getElementById('restore-file').click()" class="bg-orange-600 text-white px-6 py-3 rounded w-full">🔄 استعادة نسخة احتياطية</button>
            </div>
        </div>
    `;
}

// دوال إدارة البيانات
async function addDemoData() {
    const result = await DB.addDemoData();
    if (result) {
        alert('✅ تمت إضافة البيانات التجريبية بنجاح!');
        router('dashboard');
    }
}

async function deleteAllData() {
    const result = await DB.deleteAllDemoData();
    if (result) {
        alert('🗑️ تم حذف جميع البيانات بنجاح!');
        router('dashboard');
    }
}

// ========== الدوال المساعدة ==========
async function updateCaseStatus(id, status) {
    await DB.updateCaseStatus(id, status);
    renderCases();
}

async function openSessionModal(caseId) {
    currentCaseId = caseId;
    toggleModal('m-session');
}

async function openDocumentModal(caseId) {
    currentCaseId = caseId;
    toggleModal('m-document');
}

async function openTaskModal(caseId) {
    currentCaseId = caseId;
    toggleModal('m-task');
}

async function openPaymentModal(caseId) {
    const case_ = await DB.getCaseById(caseId);
    const amount = prompt(`المبلغ المتبقي: ${(case_.fees - case_.paidAmount).toLocaleString()} ج.م\nأدخل المبلغ المدفوع:`);
    if (amount && !isNaN(amount)) {
        const newPaid = (case_.paidAmount || 0) + parseFloat(amount);
        await DB.updateCaseFinancials(caseId, newPaid);
        alert('تم تسجيل الدفعة بنجاح');
        if (document.getElementById('main-content').innerHTML.includes('المالية')) {
            renderFinance();
        } else {
            viewCaseDetails(caseId);
        }
    }
}

async function saveSession() {
    const data = {
        caseId: currentCaseId,
        sessionDate: document.getElementById('s-date').value,
        sessionTime: document.getElementById('s-time').value,
        decision: document.getElementById('s-decision').value,
        nextSessionDate: document.getElementById('s-next-date').value,
        nextSessionTime: document.getElementById('s-next-time').value,
        notes: document.getElementById('s-notes').value
    };
    await DB.saveSession(data);
    toggleModal('m-session');
    viewCaseDetails(currentCaseId);
}

async function saveDocument() {
    const file = document.getElementById('doc-file').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = {
                caseId: currentCaseId,
                docType: document.getElementById('doc-type').value,
                docName: document.getElementById('doc-name').value || file.name,
                docData: e.target.result,
                fileType: file.type
            };
            await DB.saveDocument(data);
            toggleModal('m-document');
            alert('تم رفع المستند بنجاح');
            viewCaseDetails(currentCaseId);
        };
        reader.readAsDataURL(file);
    }
}

async function deleteSession(id) {
    if (confirm('حذف الجلسة؟')) {
        await DB.deleteSession(id);
        if (currentCaseId) {
            await viewCaseDetails(currentCaseId);
        } else {
            await renderCalendar();
        }
    }
}

function printReceipt() {
    const caseId = document.getElementById('receipt-case').value;
    const amount = document.getElementById('receipt-amount').value;
    const notes = document.getElementById('receipt-notes').value;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl"><head><title>إيصال استلام</title><style>body{font-family:Arial;padding:40px;}</style></head>
        <body><div style="border:2px solid #000;padding:20px;"><h2 style="text-align:center;">إيصال استلام نقدية</h2><hr><p><strong>رقم القضية:</strong> ${caseId}</p><p><strong>المبلغ المستلم:</strong> ${amount} ج.م</p><p><strong>الملاحظات:</strong> ${notes}</p><p><strong>التاريخ:</strong> ${new Date().toLocaleDateString()}</p><hr><p style="text-align:center;">توقيع المستلم: _________________</p></div>
        <script>window.print();setTimeout(window.close,500);<\/script></body></html>
    `);
}

async function backupDatabase() {
    await DB.backup();
    alert('تم عمل نسخة احتياطية بنجاح');
}

async function restoreDatabase(input) {
    if (input.files[0]) {
        await DB.restore(input.files[0]);
        alert('تم استعادة البيانات بنجاح');
        location.reload();
    }
}

async function saveSettings() {
    await DB.saveSetting('firmName', document.getElementById('set-firmName').value);
    await DB.saveSetting('phone', document.getElementById('set-phone').value);
    await DB.saveSetting('address', document.getElementById('set-address').value);
    await DB.saveSetting('taxNumber', document.getElementById('set-taxNumber').value);
    await DB.saveSetting('notificationEnabled', document.getElementById('set-notifications').checked.toString());
    alert('تم حفظ الإعدادات');
}

function openNewCaseForClient(clientId) {
    toggleModal('m-case');
    setTimeout(() => {
        document.getElementById('c-client').value = clientId;
    }, 100);
}

function editClient(cl) {
    currentEditId = cl.id;
    toggleModal('m-client');
    document.getElementById('cl-name').value = cl.name;
    document.getElementById('cl-phone').value = cl.phone;
    document.getElementById('cl-email').value = cl.email || '';
    document.getElementById('cl-national').value = cl.nationalId || '';
    document.getElementById('cl-address').value = cl.address || '';
}

async function handleSaveClient() {
    const data = { 
        name: document.getElementById('cl-name').value, 
        phone: document.getElementById('cl-phone').value,
        email: document.getElementById('cl-email').value,
        nationalId: document.getElementById('cl-national').value,
        address: document.getElementById('cl-address').value 
    };
    if(currentEditId) data.id = currentEditId;
    await DB.saveClient(data);
    toggleModal('m-client'); 
    renderClients();
}

async function delClient(id) { 
    if(confirm('حذف الموكل؟')) { 
        await DB.deleteClient(id); 
        renderClients(); 
    } 
}

function editCase(c) {
    currentEditId = c.id;
    toggleModal('m-case');
    document.getElementById('c-num').value = c.caseNumber;
    document.getElementById('c-tit').value = c.title;
    document.getElementById('c-opp').value = c.opponent || '';
    document.getElementById('c-opp-lawyer').value = c.opponentLawyer || '';
    document.getElementById('c-court').value = c.court || '';
    document.getElementById('c-circuit').value = c.circuit || '';
    document.getElementById('c-fees').value = c.fees || '';
    document.getElementById('c-type').value = c.caseType || 'مدني';
    document.getElementById('c-status').value = c.status || 'متداولة';
    document.getElementById('c-subject').value = c.subject || '';
    document.getElementById('c-client').value = c.clientId;
}

async function handleSaveCase() {
    const cid = document.getElementById('c-client').value;
    if(!cid) return alert('اختر موكل');
    const data = {
        caseNumber: document.getElementById('c-num').value,
        title: document.getElementById('c-tit').value,
        opponent: document.getElementById('c-opp').value,
        opponentLawyer: document.getElementById('c-opp-lawyer').value,
        court: document.getElementById('c-court').value,
        circuit: document.getElementById('c-circuit').value,
        caseType: document.getElementById('c-type').value,
        status: document.getElementById('c-status').value,
        subject: document.getElementById('c-subject').value,
        fees: parseFloat(document.getElementById('c-fees').value) || 0,
        clientId: parseInt(cid),
        paidAmount: currentEditId ? (await DB.getCaseById(currentEditId))?.paidAmount || 0 : 0
    };
    if(currentEditId) data.id = currentEditId;
    await DB.saveCase(data);
    toggleModal('m-case'); 
    renderCases();
}

async function delCase(id) { 
    if(confirm('حذف القضية؟')) { 
        await DB.deleteCase(id); 
        renderCases(); 
    } 
}

// بدء التطبيق
init();