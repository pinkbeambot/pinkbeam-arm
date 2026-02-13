'use client';

import { Lightbulb, Target, MessageSquare, Wand2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from './RichTextEditor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface InstructionsSectionProps {
  systemPrompt: string;
  successCriteria: string;
  examples: string;
  onChange: (updates: Partial<{ systemPrompt: string; successCriteria: string; examples: string }>) => void;
}

const promptTemplates = [
  {
    name: 'Professional & Formal',
    description: 'Use a professional, formal tone suitable for business communications',
    prompt: 'You are a professional agent who communicates clearly and formally. Always be polite, thorough, and accurate in your work.',
  },
  {
    name: 'Friendly & Casual',
    description: 'Use a friendly, approachable tone',
    prompt: 'You are a friendly and approachable agent. Communicate in a warm, conversational tone while maintaining professionalism.',
  },
  {
    name: 'Concise & Direct',
    description: 'Be brief and to the point',
    prompt: 'You are a concise agent who values efficiency. Keep responses brief and focused on the key information. Avoid unnecessary elaboration.',
  },
  {
    name: 'Analytical & Detailed',
    description: 'Provide thorough analysis with attention to detail',
    prompt: 'You are an analytical agent who thoroughly examines all aspects of a problem. Provide detailed analysis and consider multiple perspectives before making recommendations.',
  },
];

export function InstructionsSection({
  systemPrompt,
  successCriteria,
  examples,
  onChange,
}: InstructionsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Prompt Templates */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="templates">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-muted-foreground" />
              <span>Quick Start Templates</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2 pt-2">
              {promptTemplates.map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => onChange({ systemPrompt: template.prompt })}
                  className="text-left p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* System Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="system-prompt">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              System Instructions
            </div>
          </Label>
          <span className="text-xs text-muted-foreground">
            {systemPrompt.length} characters
          </span>
        </div>
        <RichTextEditor
          value={systemPrompt}
          onChange={(value) => onChange({ systemPrompt: value })}
          placeholder="Describe what this agent does, its personality, and how it should approach tasks. Be specific about its role, responsibilities, and any constraints..."
          minHeight="250px"
        />
        <p className="text-xs text-muted-foreground">
          These instructions guide how the agent behaves and responds. Be clear and specific about the agent&apos;s role.
        </p>
      </div>

      {/* Success Criteria */}
      <div className="space-y-2">
        <Label htmlFor="success-criteria">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Success Criteria
          </div>
        </Label>
        <Textarea
          id="success-criteria"
          value={successCriteria}
          onChange={(e) => onChange({ successCriteria: e.target.value })}
          placeholder="How do you know this agent has succeeded? e.g., 'All emails are responded to within 24 hours with accurate information'"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Define what success looks like for this agent. This helps evaluate performance.
        </p>
      </div>

      {/* Examples */}
      <div className="space-y-2">
        <Label htmlFor="examples">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            Example Inputs/Outputs (Optional)
          </div>
        </Label>
        <Textarea
          id="examples"
          value={examples}
          onChange={(e) => onChange({ examples: e.target.value })}
          placeholder="Provide examples of inputs and expected outputs to guide the agent's responses..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Few-shot examples help the agent understand the expected format and quality of responses.
        </p>
      </div>
    </div>
  );
}
