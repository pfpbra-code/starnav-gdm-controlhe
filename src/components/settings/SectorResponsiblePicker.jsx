import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Seletor múltiplo de usuários responsáveis por um setor.
 */
export default function SectorResponsiblePicker({ users, selected, onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (email) => {
    onChange(
      selected.includes(email)
        ? selected.filter((e) => e !== email)
        : [...selected, email]
    );
  };

  const nameFor = (email) => {
    const u = users.find((x) => x.email === email);
    return u?.full_name || email;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="truncate">
              {selected.length
                ? `${selected.length} responsáve${selected.length > 1 ? 'is' : 'l'} selecionado${selected.length > 1 ? 's' : ''}`
                : 'Selecionar responsáveis'}
            </span>
            <UserPlus className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar usuário..." />
            <CommandList>
              <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
              <CommandGroup>
                {users.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={`${u.full_name || ''} ${u.email}`}
                    onSelect={() => toggle(u.email)}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        selected.includes(u.email) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">
                      {u.full_name || u.email} ({u.email})
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-1">
        {selected.map((email) => (
          <Badge key={email} variant="secondary" className="gap-1 pr-1">
            <span className="max-w-[180px] truncate">{nameFor(email)}</span>
            <button
              type="button"
              className="rounded-full hover:bg-slate-200 p-0.5"
              onClick={() => toggle(email)}
              aria-label={`Remover ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}