import * as Select from '@radix-ui/react-select'

export default function TurmaSelect({ turmas, onSelect }: { 
  turmas: any[], 
  onSelect: (id: number) => void 
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Selecione a turma</h2>
      <Select.Root onValueChange={(value) => onSelect(Number(value))}>
        <Select.Trigger className="w-full p-2 border rounded">
          <Select.Value placeholder="Selecione uma turma..." />
        </Select.Trigger>
        <Select.Content className="bg-white border rounded shadow-lg">
          <Select.Group>
            {turmas.map((turma) => (
              <Select.Item 
                key={turma.id} 
                value={turma.id.toString()}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {turma.name}
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </div>
  )
}