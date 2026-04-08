import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ChainRow from '@/components/ChainRow.jsx';

const TABS = [
  { key: 'ALL',       label: 'ALL'           },
  { key: 'LANGUAGES', label: 'LANGUAGES'     },
  { key: 'QUANT',     label: 'QUANT FINANCE' },
  { key: 'VIZ',       label: 'VISUALIZATION' },
];

const OptionsChain = ({ skillsData, onSkillClick }) => {
  const [activeTab, setActiveTab] = useState('ALL');

  const filtered =
    activeTab === 'ALL' ? skillsData : skillsData.filter((s) => s.category === activeTab);

  const itmRows = filtered.filter((s) => s.itm);
  const otmRows = filtered.filter((s) => !s.itm);

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
          {TABS.map((tab) => {
            const count =
              tab.key === 'ALL'
                ? skillsData.length
                : skillsData.filter((s) => s.category === tab.key).length;
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

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 border-b border-border hover:bg-muted/40">
            <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest py-2 pl-5">
              STRIKE
            </TableHead>
            <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest py-2 px-3">
              TYPE
            </TableHead>
            <TableHead className="hidden md:table-cell font-mono text-[10px] text-muted-foreground uppercase tracking-widest py-2 px-4">
              KEY USES
            </TableHead>
            <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest py-2 pr-5 text-right">
              STATUS
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {itmRows.map((skill) => (
            <ChainRow key={skill.name} skill={skill} onClick={onSkillClick} />
          ))}

          {itmRows.length > 0 && otmRows.length > 0 && (
            <TableRow className="bg-muted/20 border-y border-border/40 hover:bg-muted/20">
              <TableCell
                colSpan={4}
                className="font-mono text-[10px] text-muted-foreground/50 tracking-widest text-center py-1.5"
              >
                ── AT THE MONEY ──
              </TableCell>
            </TableRow>
          )}

          {otmRows.map((skill) => (
            <ChainRow key={skill.name} skill={skill} onClick={onSkillClick} />
          ))}
        </TableBody>
      </Table>

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
