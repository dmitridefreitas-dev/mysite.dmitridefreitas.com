import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TerminalBadge from '@/components/TerminalBadge.jsx';

const TABS = [
  { key: 'ALL',       label: 'ALL'           },
  { key: 'LANGUAGES', label: 'LANGUAGES'     },
  { key: 'QUANT',     label: 'QUANT FINANCE' },
  { key: 'VIZ',       label: 'VISUALIZATION' },
];

function SkillCell({ skill, onClick, side }) {
  if (!skill) return <div className="flex-1" />;

  const isCall = side === 'call';
  const keyUses = skill.technicalUsedFor.slice(0, 2).map(s => s.toUpperCase()).join(' · ');

  if (isCall) {
    return (
      <div onClick={() => onClick(skill)} className="flex-1 flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group bg-terminal-green/5 hover:bg-terminal-green/10">
        <span className="font-mono text-xs font-bold w-20 shrink-0 text-left text-terminal-green">
          <span className="text-terminal-green/60 mr-1 text-[10px]">◆</span>
          {skill.name}
        </span>
        <div className="w-14 shrink-0 flex items-center justify-start">
          <TerminalBadge variant="complete">{skill.typeCode}</TerminalBadge>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground tracking-wide hidden md:block flex-1 text-left">{keyUses}</span>
        <span className="font-mono text-[10px] text-muted-foreground/60 tracking-widest w-20 shrink-0 hidden lg:block text-right">{skill.context}</span>
      </div>
    );
  }

  return (
    <div onClick={() => onClick(skill)} className="flex-1 flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group hover:bg-muted/40">
      <span className="font-mono text-[10px] text-muted-foreground/60 tracking-widest w-20 shrink-0 hidden lg:block text-left">{skill.context}</span>
      <span className="font-mono text-[10px] text-muted-foreground tracking-wide hidden md:block flex-1 text-right">{keyUses}</span>
      <div className="w-14 shrink-0 flex items-center justify-end">
        <TerminalBadge variant="date">{skill.typeCode}</TerminalBadge>
      </div>
      <span className="font-mono text-xs font-bold w-20 shrink-0 text-right text-foreground group-hover:text-primary transition-colors">
        {skill.name}
      </span>
    </div>
  );
}

const OptionsChain = ({ skillsData, onSkillClick }) => {
  const [activeTab, setActiveTab] = useState('ALL');

  const filtered =
    activeTab === 'ALL' ? skillsData : skillsData.filter(s => s.category === activeTab);

  const itmRows = filtered.filter(s => s.itm);
  const otmRows = filtered.filter(s => !s.itm);
  const rowCount = Math.max(itmRows.length, otmRows.length);
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    call: itmRows[i] ?? null,
    put:  otmRows[i] ?? null,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="border border-border overflow-hidden"
    >
      {/* Tab bar */}
      <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center gap-4">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">
          SKILL CHAIN
        </span>
        <div className="flex divide-x divide-border border border-border">
          {TABS.map(tab => {
            const count = tab.key === 'ALL'
              ? skillsData.length
              : skillsData.filter(s => s.category === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 h-7 transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 opacity-50">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex border-b border-border bg-muted/40">
        {/* Calls header — w-20 matches data row name column; text-right puts label flush against TYPE */}
        <div className="flex-1 flex items-center gap-3 px-4 py-2">
          <span className="font-mono text-[9px] text-terminal-green tracking-widest font-bold w-20 shrink-0 text-left">
            ◆ CALLS
          </span>
          <span className="font-mono text-[9px] text-muted-foreground/50 w-14 shrink-0 text-left">TYPE</span>
          <span className="font-mono text-[9px] text-muted-foreground/50 hidden md:block flex-1 text-left">KEY USES</span>
          <span className="font-mono text-[9px] text-muted-foreground/50 w-20 shrink-0 hidden lg:block text-right">CTX</span>
        </div>

        <div className="w-px bg-border" />

        {/* Puts header — w-20 matches data row name column; text-left puts label flush against TYPE */}
        <div className="flex-1 flex items-center gap-3 px-4 py-2">
          <span className="font-mono text-[9px] text-muted-foreground/50 w-20 shrink-0 hidden lg:block text-left">CTX</span>
          <span className="font-mono text-[9px] text-muted-foreground/50 hidden md:block flex-1 text-right">KEY USES</span>
          <span className="font-mono text-[9px] text-muted-foreground/50 w-14 shrink-0 text-right">TYPE</span>
          <span className="font-mono text-[9px] text-muted-foreground/70 tracking-widest font-bold w-20 shrink-0 text-right">
            PUTS
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/60">
        {rows.map((row, i) => (
          <div key={i} className="flex">
            <SkillCell skill={row.call} onClick={onSkillClick} side="call" />
            <div className="w-px bg-border/60 shrink-0" />
            <SkillCell skill={row.put} onClick={onSkillClick} side="put" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-muted/20 border-t border-border px-5 py-2 flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground/50 tracking-widest">
          {filtered.length} INSTRUMENTS · {itmRows.length} ITM · {otmRows.length} OTM
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/40 tracking-widest">
          CLICK ANY STRIKE TO EXPAND
        </span>
      </div>
    </motion.div>
  );
};

export default OptionsChain;
