# Implementation Notes - Table Standardization

## Pattern from RelatoriosSection

### Structure:
```
<div className="bg-white dark:bg-gray-800 rounded-lg border">
  <div className="p-4 border-b bg-gray-50 dark:bg-gray-900/50">
    <!-- Header with title, count, actions -->
  </div>
  
  <div className="divide-y">
    {items.map(item => (
      <div key={item.id}>
        <div className="p-4 cursor-pointer transition-colors hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button><ChevronIcon /></button>
              <div>{item.name}</div>
            </div>
            <div className="flex items-center gap-3">
              <!-- Actions -->
            </div>
          </div>
        </div>
        
        <!-- Expanded details -->
        {expanded && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t">
            <!-- Details content -->
          </div>
        )}
      </div>
    ))}
  </div>
</div>
```

## To Apply:

1. **ProfessoresSection**: Nome + Login visible, details expandable
2. **AlunosSection**: Nome only, details with edit/delete/reports/concepts  
3. **TurmasSection**: Número only, details expandable
4. **MateriasSection**: Nome only, details expandable
5. **RelatoriosSection**: Add CRUD operations

## Changes Made:
- Removed bimestre from sidebar (professor)
- Removed relatórios enviados from criar section
- All tables follow same visual pattern
