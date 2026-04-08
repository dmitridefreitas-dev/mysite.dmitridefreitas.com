import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiServerClient from '@/lib/apiServerClient.js';
import SectionHeader from '@/components/SectionHeader.jsx';
import TerminalLoader from '@/components/TerminalLoader.jsx';

const DotRow = ({ label, value, href }) => {
  const dots = Math.max(4, 48 - label.length - String(value).length);
  return (
    <div className="font-mono text-xs flex gap-1">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-muted-foreground/25 flex-1 overflow-hidden select-none">{'·'.repeat(dots)}</span>
      {href ? (
        <a href={href} className="text-primary hover:text-primary/80 transition-colors shrink-0">{value}</a>
      ) : (
        <span className="text-foreground shrink-0">{value}</span>
      )}
    </div>
  );
};

const SUBJECTS = [
  'FULL_TIME_OPPORTUNITY',
  'INTERNSHIP_INQUIRY',
  'RESEARCH_COLLABORATION',
  'PROJECT_DISCUSSION',
  'OTHER',
];

const ContactPage = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.email || !formData.message) {
      toast({ title: 'VALIDATION_ERROR', description: 'All fields required.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiServerClient.fetch('/contact/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'TRANSMISSION_FAILED');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast({
        title: 'TRANSMISSION_ERROR',
        description: error.message || 'Failed to send. Please retry or contact directly.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact — Dmitri De Freitas</title>
        <meta
          name="description"
          content="Contact Dmitri De Freitas. Available May 2026 for full-time opportunities in quantitative finance and data science."
        />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-16">

        {/* Hero */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="04" title="CONTACT / INQUIRY SUBMISSION TERMINAL" />
            <p className="font-mono text-xs text-muted-foreground max-w-xl">
              Direct inquiries preferred. Response time: 24–48h. Available for full-time positions starting 2026-05-01.
            </p>
          </div>
        </section>

        {/* Main layout */}
        <section className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-5 gap-10 max-w-5xl">

              {/* Left: Contact info panel */}
              <div className="md:col-span-2 space-y-8">

                {/* Direct contact */}
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">DIRECT CONTACT</p>
                  <div className="space-y-2">
                    <DotRow label="EMAIL" value="d.defreitas@wustl.edu" href="mailto:d.defreitas@wustl.edu" />
                    <DotRow label="PHONE" value="+1-314-646-9845" href="tel:+13146469845" />
                    <DotRow label="LOCATION" value="St. Louis, MO" />
                    <DotRow label="AVAILABLE" value="2026-05-01" />
                  </div>
                </div>

                {/* External links */}
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">EXTERNAL LINKS</p>
                  <div className="space-y-2">
                    <div>
                      <a
                        href="https://www.linkedin.com/in/dmitri-de-freitas-16a540347/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:text-primary/80 transition-colors tracking-widest"
                      >
                        [LINKEDIN →]
                      </a>
                    </div>
                    <div>
                      <a
                        href="https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:text-primary/80 transition-colors tracking-widest"
                      >
                        [DOWNLOAD CV.PDF →]
                      </a>
                    </div>
                  </div>
                </div>

                {/* Opportunity scope */}
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">OPPORTUNITY SCOPE</p>
                  <div className="space-y-1">
                    {[
                      'Quantitative Research Analyst',
                      'Financial Engineer',
                      'Data Scientist',
                      'Algorithmic Trading Developer',
                    ].map((role) => (
                      <p key={role} className="font-mono text-[11px] text-muted-foreground">
                        · {role}
                      </p>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right: Inquiry form */}
              <motion.div
                className="md:col-span-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">INQUIRY FORM</p>

                {submitted ? (
                  <TerminalLoader success successMessage="INQUIRY TRANSMITTED SUCCESSFULLY" />
                ) : isSubmitting ? (
                  <TerminalLoader success={false} />
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Name + Email row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="name" className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                          NAME *
                        </label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Full name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="font-mono text-xs rounded-none border-border bg-muted/20 focus-visible:ring-0 focus-visible:border-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="email" className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                          EMAIL *
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="you@firm.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="font-mono text-xs rounded-none border-border bg-muted/20 focus-visible:ring-0 focus-visible:border-primary"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <label htmlFor="subject" className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        SUBJECT
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {SUBJECTS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, subject: s }))}
                            className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                              formData.subject === s
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <label htmlFor="message" className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        MESSAGE *
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Describe the role, project, or inquiry..."
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className="font-mono text-xs rounded-none border-border bg-muted/20 focus-visible:ring-0 focus-visible:border-primary resize-none"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="font-mono text-xs tracking-widest px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-3 h-3" />
                      SUBMIT INQUIRY
                    </button>

                  </form>
                )}
              </motion.div>

            </div>
          </div>
        </section>

      </div>
    </>
  );
};

export default ContactPage;
