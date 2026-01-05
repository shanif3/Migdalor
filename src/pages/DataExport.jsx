import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Loader2, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function DataExport() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDDL, setLoadingDDL] = useState(false);
  const [loadingRLS, setLoadingRLS] = useState(false);
  const [exportedSQL, setExportedSQL] = useState('');
  const [selectedEntities, setSelectedEntities] = useState({});

  const entities = [
    'HackalonSubmission',
    'HackalonTeam',
    'HackalonDepartment',
    'HackalonScheduleItem',
    'ClassroomKey',
    'Crew',
    'Squad',
    'Position',
    'Zone',
    'PositionPermission',
    'WaitingQueue',
    'Lesson'
  ];

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        
        // Initialize all entities as selected
        const initial = {};
        entities.forEach(e => initial[e] = true);
        setSelectedEntities(initial);
      } catch (error) {
        console.error(error);
      }
    };
    loadUser();
  }, []);

  const escapeSQLString = (str) => {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'boolean') return str ? 'true' : 'false';
    if (typeof str === 'number') return str;
    if (Array.isArray(str)) return `'${JSON.stringify(str).replace(/'/g, "''")}'`;
    if (typeof str === 'object') return `'${JSON.stringify(str).replace(/'/g, "''")}'`;
    return `'${String(str).replace(/'/g, "''")}'`;
  };

  const formatDateForSQL = (date) => {
    if (!date) return 'NULL';
    try {
      return `'${new Date(date).toISOString()}'`;
    } catch {
      return 'NULL';
    }
  };

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const generateSQLForEntity = (entityName, records, schema) => {
    if (!records || records.length === 0) return '';

    const tableName = entityName.toLowerCase();
    let sql = `-- ${entityName} (${records.length} records)\n`;
    
    // Get all possible columns from schema and records
    const schemaFields = schema?.properties ? Object.keys(schema.properties) : [];
    const recordFields = new Set();
    records.forEach(record => {
      Object.keys(record).forEach(key => recordFields.add(key));
    });
    
    const allFields = [...new Set([...schemaFields, ...recordFields])];
    const fields = ['id', 'created_date', 'updated_date', 'created_by', ...allFields.filter(f => !['id', 'created_date', 'updated_date', 'created_by'].includes(f))];

    records.forEach(record => {
      const values = fields.map(field => {
        const value = record[field];
        
        // Handle special fields
        if (field === 'id') return escapeSQLString(record.id || generateUUID());
        if (field === 'created_date' || field === 'updated_date') return formatDateForSQL(value);
        if (field === 'created_by') return escapeSQLString(value);
        
        // Handle different data types based on schema
        const fieldSchema = schema?.properties?.[field];
        if (fieldSchema) {
          if (fieldSchema.format === 'date' || fieldSchema.format === 'date-time') {
            return formatDateForSQL(value);
          }
          if (fieldSchema.type === 'boolean') {
            return value === true ? 'true' : 'false';
          }
          if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
            return value !== null && value !== undefined ? value : 'NULL';
          }
          if (fieldSchema.type === 'array' || fieldSchema.type === 'object') {
            return escapeSQLString(value);
          }
        }
        
        return escapeSQLString(value);
      });

      sql += `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${values.join(', ')});\n`;
    });

    sql += '\n';
    return sql;
  };

  const handleExport = async () => {
    setLoading(true);
    let allSQL = `-- Base44 Data Export to PostgreSQL\n`;
    allSQL += `-- Generated: ${new Date().toISOString()}\n`;
    allSQL += `-- App: ${window.location.origin}\n\n`;
    allSQL += `BEGIN;\n\n`;

    try {
      for (const entityName of entities) {
        if (!selectedEntities[entityName]) continue;

        try {
          // Fetch entity data
          const records = await base44.entities[entityName].list();
          
          // Fetch entity schema
          let schema = null;
          try {
            schema = await base44.entities[entityName].schema();
          } catch (e) {
            console.warn(`Could not fetch schema for ${entityName}:`, e);
          }

          // Generate SQL
          const sql = generateSQLForEntity(entityName, records, schema);
          allSQL += sql;
        } catch (error) {
          console.error(`Error exporting ${entityName}:`, error);
          allSQL += `-- Error exporting ${entityName}: ${error.message}\n\n`;
        }
      }

      allSQL += `COMMIT;\n`;
      setExportedSQL(allSQL);
      toast.success('הנתונים יוצאו בהצלחה');
    } catch (error) {
      toast.error('שגיאה בייצוא הנתונים');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportedSQL], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base44_export_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('הקובץ הורד בהצלחה');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedSQL);
    toast.success('הועתק ללוח');
  };

  const getSQLType = (fieldSchema) => {
    if (!fieldSchema) return 'TEXT';
    
    if (fieldSchema.type === 'string') {
      if (fieldSchema.format === 'date') return 'DATE';
      if (fieldSchema.format === 'date-time') return 'TIMESTAMP WITH TIME ZONE';
      if (fieldSchema.enum) return 'TEXT';
      return 'TEXT';
    }
    if (fieldSchema.type === 'number') return 'NUMERIC';
    if (fieldSchema.type === 'integer') return 'INTEGER';
    if (fieldSchema.type === 'boolean') return 'BOOLEAN';
    if (fieldSchema.type === 'array') return 'JSONB';
    if (fieldSchema.type === 'object') return 'JSONB';
    
    return 'TEXT';
  };

  const generateDDL = async () => {
    setLoadingDDL(true);
    let ddl = `-- DDL (Data Definition Language) Export\n`;
    ddl += `-- Generated: ${new Date().toISOString()}\n`;
    ddl += `-- App: ${window.location.origin}\n\n`;

    try {
      for (const entityName of entities) {
        if (!selectedEntities[entityName]) continue;

        try {
          const schema = await base44.entities[entityName].schema();
          const tableName = entityName.toLowerCase();
          
          ddl += `-- ${entityName}\n`;
          ddl += `CREATE TABLE ${tableName} (\n`;
          
          // Built-in fields
          ddl += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
          ddl += `  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n`;
          ddl += `  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n`;
          ddl += `  created_by TEXT,\n`;
          
          // Schema fields
          if (schema?.properties) {
            const fields = Object.entries(schema.properties);
            fields.forEach(([fieldName, fieldSchema], idx) => {
              const sqlType = getSQLType(fieldSchema);
              const isRequired = schema.required?.includes(fieldName);
              const notNull = isRequired ? ' NOT NULL' : '';
              const defaultVal = fieldSchema.default !== undefined 
                ? ` DEFAULT ${typeof fieldSchema.default === 'string' ? `'${fieldSchema.default}'` : fieldSchema.default}`
                : '';
              
              ddl += `  ${fieldName} ${sqlType}${notNull}${defaultVal}`;
              if (idx < fields.length - 1) ddl += ',';
              if (fieldSchema.description) {
                ddl += ` -- ${fieldSchema.description}`;
              }
              ddl += '\n';
            });
          }
          
          ddl += `);\n\n`;
          
          // Add indexes
          ddl += `CREATE INDEX idx_${tableName}_created_date ON ${tableName}(created_date);\n`;
          ddl += `CREATE INDEX idx_${tableName}_created_by ON ${tableName}(created_by);\n\n`;
          
        } catch (error) {
          ddl += `-- Error generating DDL for ${entityName}: ${error.message}\n\n`;
        }
      }

      const blob = new Blob([ddl], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `base44_ddl_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('קובץ DDL הורד בהצלחה');
    } catch (error) {
      toast.error('שגיאה ביצירת DDL');
      console.error(error);
    } finally {
      setLoadingDDL(false);
    }
  };

  const generateRLS = async () => {
    setLoadingRLS(true);
    let rls = `-- RLS (Row Level Security) Policies Export\n`;
    rls += `-- Generated: ${new Date().toISOString()}\n`;
    rls += `-- App: ${window.location.origin}\n\n`;

    try {
      for (const entityName of entities) {
        if (!selectedEntities[entityName]) continue;

        try {
          const schema = await base44.entities[entityName].schema();
          const tableName = entityName.toLowerCase();
          
          if (!schema?.rls) {
            rls += `-- ${entityName}: No RLS policies defined\n\n`;
            continue;
          }

          rls += `-- ${entityName} RLS Policies\n`;
          rls += `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
          
          // Create policies
          if (schema.rls.read) {
            rls += `-- Read Policy\n`;
            rls += `CREATE POLICY "${tableName}_read_policy" ON ${tableName}\n`;
            rls += `  FOR SELECT\n`;
            rls += `  USING (\n`;
            rls += `    -- ${JSON.stringify(schema.rls.read, null, 2).replace(/\n/g, '\n    -- ')}\n`;
            rls += `    true -- Customize based on your RLS rules\n`;
            rls += `  );\n\n`;
          }

          if (schema.rls.create) {
            rls += `-- Create Policy\n`;
            rls += `CREATE POLICY "${tableName}_create_policy" ON ${tableName}\n`;
            rls += `  FOR INSERT\n`;
            rls += `  WITH CHECK (\n`;
            rls += `    -- ${JSON.stringify(schema.rls.create, null, 2).replace(/\n/g, '\n    -- ')}\n`;
            rls += `    true -- Customize based on your RLS rules\n`;
            rls += `  );\n\n`;
          }

          if (schema.rls.update) {
            rls += `-- Update Policy\n`;
            rls += `CREATE POLICY "${tableName}_update_policy" ON ${tableName}\n`;
            rls += `  FOR UPDATE\n`;
            rls += `  USING (\n`;
            rls += `    -- ${JSON.stringify(schema.rls.update, null, 2).replace(/\n/g, '\n    -- ')}\n`;
            rls += `    true -- Customize based on your RLS rules\n`;
            rls += `  );\n\n`;
          }

          if (schema.rls.delete) {
            rls += `-- Delete Policy\n`;
            rls += `CREATE POLICY "${tableName}_delete_policy" ON ${tableName}\n`;
            rls += `  FOR DELETE\n`;
            rls += `  USING (\n`;
            rls += `    -- ${JSON.stringify(schema.rls.delete, null, 2).replace(/\n/g, '\n    -- ')}\n`;
            rls += `    true -- Customize based on your RLS rules\n`;
            rls += `  );\n\n`;
          }
          
        } catch (error) {
          rls += `-- Error generating RLS for ${entityName}: ${error.message}\n\n`;
        }
      }

      const blob = new Blob([rls], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `base44_rls_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('קובץ RLS הורד בהצלחה');
    } catch (error) {
      toast.error('שגיאה ביצירת RLS');
      console.error(error);
    } finally {
      setLoadingRLS(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <Database className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">אין הרשאת גישה</h2>
          <p className="text-slate-600">רק מנהלים יכולים לייצא נתונים</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-600" />
            ייצוא נתונים ל-PostgreSQL
          </h1>
          <p className="text-slate-500">ייצוא כל הנתונים בפורמט SQL תואם Supabase</p>
        </div>

        {/* Entity Selection */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">בחר טבלאות לייצוא</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {entities.map(entity => (
              <label key={entity} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedEntities[entity] || false}
                  onChange={(e) => setSelectedEntities({
                    ...selectedEntities,
                    [entity]: e.target.checked
                  })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-700">{entity}</span>
              </label>
            ))}
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const all = {};
                entities.forEach(e => all[e] = true);
                setSelectedEntities(all);
              }}
            >
              בחר הכל
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const none = {};
                entities.forEach(e => none[e] = false);
                setSelectedEntities(none);
              }}
            >
              בטל הכל
            </Button>
          </div>
        </Card>

        {/* Export Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-2">ייצוא נתונים</h3>
            <p className="text-sm text-slate-600 mb-4">INSERT statements</p>
            <Button
              onClick={handleExport}
              disabled={loading || Object.values(selectedEntities).every(v => !v)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מייצא...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 ml-2" />
                  ייצא נתונים
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-2">DDL Schema</h3>
            <p className="text-sm text-slate-600 mb-4">CREATE TABLE statements</p>
            <Button
              onClick={generateDDL}
              disabled={loadingDDL || Object.values(selectedEntities).every(v => !v)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loadingDDL ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מייצא...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 ml-2" />
                  הורד DDL
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-2">RLS Policies</h3>
            <p className="text-sm text-slate-600 mb-4">Row Level Security</p>
            <Button
              onClick={generateRLS}
              disabled={loadingRLS || Object.values(selectedEntities).every(v => !v)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loadingRLS ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מייצא...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 ml-2" />
                  הורד RLS
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Results */}
        {exportedSQL && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-bold text-slate-800">SQL מוכן</h2>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCopy} variant="outline" size="sm">
                  <Copy className="w-4 h-4 ml-2" />
                  העתק
                </Button>
                <Button onClick={handleDownload} size="sm">
                  <Download className="w-4 h-4 ml-2" />
                  הורד קובץ
                </Button>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto">
              <pre className="text-xs font-mono" dir="ltr">{exportedSQL}</pre>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">הוראות שימוש:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>צור טבלאות ב-Supabase שתואמות את ה-schema של Base44</li>
                <li>העתק את הקוד SQL או הורד את הקובץ</li>
                <li>הרץ את הקוד ב-Supabase SQL Editor</li>
                <li>וודא שכל ה-foreign keys מוגדרים נכון</li>
              </ol>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}