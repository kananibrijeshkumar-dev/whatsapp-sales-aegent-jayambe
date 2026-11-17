// Helper: Push lead to Odoo CRM with Salesperson Assignment (True Round-Robin from Odoo History)
async function syncLeadToOdoo(phone, leadData) {
    try {
        let assignedRep = null;
        if (leadData.assignedRep) {
            assignedRep = SALES_TEAM.find(m => m.name.toLowerCase() === leadData.assignedRep.toLowerCase());
        }
        if (!assignedRep && leadData.assignedRepPhone) {
            assignedRep = SALES_TEAM.find(m => m.phone === leadData.assignedRepPhone);
        }

        if (assignedRep) {
            leadData.assignedRep = assignedRep.name;
            leadData.assignedRepId = assignedRep.id;
            leadData.assignedRepGu = assignedRep.gu;
            leadData.assignedRepHi = assignedRep.hi;
            leadData.assignedRepEn = assignedRep.en;
            leadData.assignedRepPhone = assignedRep.phone;

            const leadRecord = {
                name: `WhatsApp Lead: ${leadData.name || "Customer"} - ${leadData.hp || "20 HP"} (${leadData.typeEn || leadData.type || "Commercial"})`,
                contact_name: leadData.name || "Customer",
                mobile: phone,
                phone: phone,
                city: leadData.city || "",
                user_id: assignedRep.id,
                description: `Assigned Sales Executive: ${assignedRep.name} (${assignedRep.phone})\nCategory: ${leadData.categoryEn || leadData.category || ""}\nType: ${leadData.typeEn || leadData.type || ""}\nCapacity: ${leadData.hp || ""}\nState: ${leadData.state || ""}\nLanguage: ${leadData.lang || ""}\nSource: WhatsApp AI Interactive Agent`
            };

            if (leadData.leadId) {
                await callOdoo("crm.lead", "write", [[leadData.leadId], leadRecord]);
                console.log(`Successfully updated Odoo lead ID: ${leadData.leadId} under rep: ${assignedRep.name}`);
                return true;
            }

            const newId = await callOdoo("crm.lead", "create", [[leadRecord]]);
            const actualId = Array.isArray(newId) ? newId[0] : newId;
            if (actualId) {
                leadData.leadId = actualId;
                console.log(`Successfully logged Odoo lead ID: ${actualId} under PERMANENT rep: ${assignedRep.name}`);
            }
            return true;
        }

        let nextIndex = 0;
        try {
            const lastLeads = await callOdoo("crm.lead", "search_read", [[]], {
                fields: ["id", "user_id"],
                limit: 1,
                order: "id desc"
            });
            if (Array.isArray(lastLeads) && lastLeads.length > 0 && lastLeads[0].user_id) {
                const lastUserId = Array.isArray(lastLeads[0].user_id) ? lastLeads[0].user_id[0] : lastLeads[0].user_id;
                const lastIndex = SALES_TEAM.findIndex(m => m.id === lastUserId);
                if (lastIndex !== -1) {
                    nextIndex = (lastIndex + 1) % SALES_TEAM.length;
                } else {
                    nextIndex = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
                }
            } else {
                nextIndex = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
            }
        } catch (e) {
            nextIndex = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
        }

        assignedRep = SALES_TEAM[nextIndex];
        leadData.assignedRep = assignedRep.name;
        leadData.assignedRepId = assignedRep.id;
        leadData.assignedRepGu = assignedRep.gu;
        leadData.assignedRepHi = assignedRep.hi;
        leadData.assignedRepEn = assignedRep.en;
        leadData.assignedRepPhone = assignedRep.phone;

        const leadRecord = {
            name: `WhatsApp Lead: ${leadData.name || "Customer"} - ${leadData.hp || "20 HP"} (${leadData.typeEn || leadData.type || "Commercial"})`,
            contact_name: leadData.name || "Customer",
            mobile: phone,
            phone: phone,
            city: leadData.city || "",
            user_id: assignedRep.id,
            description: `Assigned Sales Executive: ${assignedRep.name} (${assignedRep.phone})\nCategory: ${leadData.categoryEn || leadData.category || ""}\nType: ${leadData.typeEn || leadData.type || ""}\nCapacity: ${leadData.hp || ""}\nState: ${leadData.state || ""}\nLanguage: ${leadData.lang || ""}\nSource: WhatsApp AI Interactive Agent`
        };

        const newId = await callOdoo("crm.lead", "create", [[leadRecord]]);
        const actualId = Array.isArray(newId) ? newId[0] : newId;
        if (actualId) {
            leadData.leadId = actualId;
            console.log(`Successfully created Odoo lead ID: ${actualId} rotated to: ${assignedRep.name} (${assignedRep.phone}) (Index ${nextIndex}/${SALES_TEAM.length})`);
        }
        return true;
    } catch (e) {
        console.error("Odoo sync error:", e);
        const fbIdx = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
        const assignedRep = SALES_TEAM[fbIdx];
        leadData.assignedRep = assignedRep.name;
        leadData.assignedRepGu = assignedRep.gu;
        leadData.assignedRepHi = assignedRep.hi;
        leadData.assignedRepEn = assignedRep.en;
        leadData.assignedRepPhone = assignedRep.phone;
        return false;
    }
}

// Helper: Push lead to Odoo CRM with Salesperson Assignment (True Round-Robin from Odoo History)
function syncLeadToOdoo(phone, leadData) {
    return new Promise((resolve) => {
        try {
            const common = xmlrpc.createSecureClient({ host: 'v1.viducrm.com', port: 443, path: '/xmlrpc/2/common' });
            common.methodCall('authenticate', [ODOO_DB, ODOO_USER, ODOO_PASS, {}], (err, uid) => {
                if (err || !uid) {
                    console.error('Odoo auth error:', err);
                    const fbIdx = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
                    const assignedRep = SALES_TEAM[fbIdx];
                    leadData.assignedRep = assignedRep.name;
                    leadData.assignedRepGu = assignedRep.gu;
                    leadData.assignedRepHi = assignedRep.hi;
                    leadData.assignedRepEn = assignedRep.en;
                    leadData.assignedRepPhone = assignedRep.phone;
                    return resolve(false);
                }

                const models = xmlrpc.createSecureClient({ host: 'v1.viducrm.com', port: 443, path: '/xmlrpc/2/object' });

                // If customer ALREADY has an assigned salesperson, ALWAYS preserve them permanently!
                let assignedRep = null;
                if (leadData.assignedRep) {
                    assignedRep = SALES_TEAM.find(m => m.name.toLowerCase() === leadData.assignedRep.toLowerCase());
                }
                if (!assignedRep && leadData.assignedRepPhone) {
                    assignedRep = SALES_TEAM.find(m => m.phone === leadData.assignedRepPhone);
                }

                if (assignedRep) {
                    leadData.assignedRep = assignedRep.name;
                    leadData.assignedRepId = assignedRep.id;
                    leadData.assignedRepGu = assignedRep.gu;
                    leadData.assignedRepHi = assignedRep.hi;
                    leadData.assignedRepEn = assignedRep.en;
                    leadData.assignedRepPhone = assignedRep.phone;

                    const leadRecord = {
                        name: `WhatsApp Lead: ${leadData.name || 'Customer'} - ${leadData.hp || '20 HP'} (${leadData.typeEn || leadData.type || 'Commercial'})`,
                        contact_name: leadData.name || 'Customer',
                        mobile: phone,
                        phone: phone,
                        city: leadData.city || '',
                        user_id: assignedRep.id,
                        description: `Assigned Sales Executive: ${assignedRep.name} (${assignedRep.phone})\nCategory: ${leadData.categoryEn || leadData.category || ''}\nType: ${leadData.typeEn || leadData.type || ''}\nCapacity: ${leadData.hp || ''}\nState: ${leadData.state || ''}\nLanguage: ${leadData.lang || ''}\nSource: WhatsApp AI Interactive Agent`
                    };

                    if (leadData.leadId) {
                        models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_PASS, 'crm.lead', 'write', [[leadData.leadId], leadRecord]], (writeErr, success) => {
                            if (!writeErr) {
                                console.log(`Successfully updated Odoo lead ID: ${leadData.leadId} under rep: ${assignedRep.name}`);
                            }
                            resolve(true);
                        });
                        return;
                    }

                    models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_PASS, 'crm.lead', 'create', [leadRecord]], (leadErr, leadId) => {
                        if (!leadErr) {
                            leadData.leadId = leadId;
                            console.log(`Successfully logged Odoo lead ID: ${leadId} under PERMANENT rep: ${assignedRep.name}`);
                        }
                        resolve(true);
                    });
                    return;
                }

                // Step 1: For BRAND NEW customers, Query the last lead from Odoo CRM to determine next salesperson in round-robin sequence
                models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_PASS, 'crm.lead', 'search_read', [[]], {
                    fields: ['id', 'user_id'],
                    limit: 1,
                    order: 'id desc'
                }], (searchErr, lastLeads) => {
                    let nextIndex = 0;
                    if (!searchErr && Array.isArray(lastLeads) && lastLeads.length > 0 && lastLeads[0].user_id) {
                        const lastUserId = Array.isArray(lastLeads[0].user_id) ? lastLeads[0].user_id[0] : lastLeads[0].user_id;
                        const lastIndex = SALES_TEAM.findIndex(m => m.id === lastUserId);
                        if (lastIndex !== -1) {
                            nextIndex = (lastIndex + 1) % SALES_TEAM.length;
                        } else {
                            nextIndex = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
                        }
                    } else {
                        nextIndex = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
                    }

                    const assignedRep = SALES_TEAM[nextIndex];
                    leadData.assignedRep = assignedRep.name;
                    leadData.assignedRepId = assignedRep.id;
                    leadData.assignedRepGu = assignedRep.gu;
                    leadData.assignedRepHi = assignedRep.hi;
                    leadData.assignedRepEn = assignedRep.en;
                    leadData.assignedRepPhone = assignedRep.phone;

                    const leadRecord = {
                        name: `WhatsApp Lead: ${leadData.name || 'Customer'} - ${leadData.hp || '20 HP'} (${leadData.typeEn || leadData.type || 'Commercial'})`,
                        contact_name: leadData.name || 'Customer',
                        mobile: phone,
                        phone: phone,
                        city: leadData.city || '',
                        user_id: assignedRep.id,
                        description: `Assigned Sales Executive: ${assignedRep.name} (${assignedRep.phone})\nCategory: ${leadData.categoryEn || leadData.category || ''}\nType: ${leadData.typeEn || leadData.type || ''}\nCapacity: ${leadData.hp || ''}\nState: ${leadData.state || ''}\nLanguage: ${leadData.lang || ''}\nSource: WhatsApp AI Interactive Agent`
                    };

                    models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_PASS, 'crm.lead', 'create', [leadRecord]], (leadErr, leadId) => {
                        if (leadErr) {
                            console.error('Odoo lead creation error:', leadErr);
                        } else {
                            console.log(`Successfully created Odoo lead ID: ${leadId} rotated to: ${assignedRep.name} (${assignedRep.phone}) (Index ${nextIndex}/${SALES_TEAM.length})`);
                        }
                        resolve(true);
                    });
                });
            });
        } catch (e) {
            console.error('Odoo sync error:', e);
            const fbIdx = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
            const assignedRep = SALES_TEAM[fbIdx];
            leadData.assignedRep = assignedRep.name;
            leadData.assignedRepGu = assignedRep.gu;
            leadData.assignedRepHi = assignedRep.hi;
            leadData.assignedRepEn = assignedRep.en;
            leadData.assignedRepPhone = assignedRep.phone;
            resolve(false);
        }
    });
}

// Helper: Push lead to Supabase (whatsapp_customers table ONLY - never website inquiries)
async function syncLeadToSupabase(phone, leadData) {
    if (!supabase) return;
    try {
        const assignedName = leadData.assignedRep || 'Sales Team';
        const istTime = getISTTimestamp();
        await supabase.from('whatsapp_customers').upsert([{
            phone: phone,
            name: leadData.name ? `${leadData.name} [${assignedName}]` : `New Lead [${assignedName}]`,
            assigned_salesperson: assignedName,
            City: leadData.city || 'Pending',
            state: `${leadData.city || 'India'}, ${leadData.state || 'India'} (${leadData.hp || '20 HP'}) | IST: ${istTime}`,
            last_message: new Date().toISOString()
        }], { onConflict: 'phone' });
        console.log('Successfully synced to Supabase whatsapp_customers for:', phone);
    } catch (e) {
        console.error('Supabase sync general error:', e.message);
    }
}

module.exports = app;
