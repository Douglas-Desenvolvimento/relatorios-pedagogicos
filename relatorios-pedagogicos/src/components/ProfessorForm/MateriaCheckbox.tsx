import { Checkbox } from '@radix-ui/react-checkbox'

export default function MateriaCheckbox({ materias, onSelect }: { 
  materias: any[], 
  onSelect: (id: number) => void 
}) {
  // Assumindo que o professor seleciona apenas uma matéria por vez
  const handleSelect = (materiaId: number) => {
    onSelect(materiaId)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Selecione sua matéria</h2>
      <div className="space-y-2">
        {materias.map((materia) => (
          <div key={materia.id} className="flex items-center">
            <Checkbox
              id={`materia-${materia.id}`}
              className="mr-2 h-4 w-4"
              onClick={() => handleSelect(materia.id)}
            />
            <label htmlFor={`materia-${materia.id}`}>{materia.name}</label>
          </div>
        ))}
      </div>
    </div>
  )
}