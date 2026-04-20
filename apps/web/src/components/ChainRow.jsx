import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import TerminalBadge from '@/components/TerminalBadge.jsx';

const ChainRow = ({ skill, onClick }) => {
  const keyUses = skill.technicalUsedFor
    .slice(0, 2)
    .map((s) => s.toUpperCase())
    .join(' · ');

  return (
    <TableRow
      onClick={() => onClick(skill)}
      className={`group cursor-pointer transition-colors ${
        skill.itm
          ? 'bg-terminal-green/5 hover:bg-terminal-green/10'
          : 'hover:bg-muted/40'
      }`}
    >
      {/* STRIKE — skill name is the hero */}
      <TableCell className="py-3 pl-5 min-w-[140px]">
        <span
          className={`font-mono text-xs ${
            skill.itm
              ? 'text-terminal-green font-bold'
              : 'text-foreground font-bold group-hover:text-primary transition-colors'
          }`}
        >
          {skill.itm && (
            <span className="text-terminal-green/60 mr-1.5 text-[10px]">◆</span>
          )}
          {skill.name}
        </span>
      </TableCell>

      {/* TYPE badge */}
      <TableCell className="py-3 px-3">
        <TerminalBadge variant={skill.itm ? 'complete' : 'date'}>
          {skill.typeCode}
        </TerminalBadge>
      </TableCell>

      {/* KEY USES — hidden on mobile */}
      <TableCell className="hidden md:table-cell py-3 px-4 max-w-[280px]">
        <span className="font-mono text-[10px] text-muted-foreground tracking-wide">
          {keyUses}
        </span>
      </TableCell>

      {/* STATUS */}
      <TableCell className="py-3 pr-5 text-right">
        <span className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">
          {skill.context}
        </span>
        <span className="font-mono text-[10px] text-primary tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ml-3">
          EXPAND →
        </span>
      </TableCell>
    </TableRow>
  );
};

export default ChainRow;
