/**
 * Example: Incident Response Automation
 *
 * Demonstrates a real-world use case for automated incident response
 */

import { ClaudeClient } from '../src/claude/index.ts';
import type { Claude } from '../src/claude/index.ts';

interface IncidentReport {
  severity: string;
  summary: string;
  actions: string[];
  cost: number;
}

async function analyzeIncident(description: string): Promise<IncidentReport> {
  const client = new ClaudeClient();

  console.log('Analyzing incident...\n');

  const session = client.createSession();

  // Step 1: Initial analysis
  console.log('Step 1: Gathering system information...');
  const step1 = await session.send(
    `Analyze this incident: ${description}\n\nFirst, check system logs and resource usage.`,
    {
      outputFormat: 'json',
      allowedTools: ['Bash', 'Read', 'Grep'],
    }
  );

  if (step1.format === 'json') {
    console.log(`  ✓ Completed (${step1.duration_ms}ms)\n`);
  }

  // Step 2: Determine severity
  console.log('Step 2: Determining severity...');
  const step2 = await session.send(
    'Based on the information gathered, what is the severity level (Low/Medium/High/Critical)?',
    {
      outputFormat: 'json',
    }
  );

  let severity = 'Unknown';
  if (step2.format === 'json') {
    console.log(`  ✓ Completed (${step2.duration_ms}ms)\n`);
    // Extract severity from response
    const response = step2.result.toLowerCase();
    if (response.includes('critical')) severity = 'Critical';
    else if (response.includes('high')) severity = 'High';
    else if (response.includes('medium')) severity = 'Medium';
    else if (response.includes('low')) severity = 'Low';
  }

  // Step 3: Recommend actions
  console.log('Step 3: Recommending remediation actions...');
  const step3 = await session.send(
    'What immediate actions should be taken to resolve or mitigate this issue? List them clearly.',
    {
      outputFormat: 'json',
    }
  );

  let actions: string[] = [];
  if (step3.format === 'json') {
    console.log(`  ✓ Completed (${step3.duration_ms}ms)\n`);
    // Extract action items (simplified parsing)
    actions = step3.result.split('\n')
      .filter(line => line.match(/^[\d\-\*]/) || line.startsWith('•'))
      .map(line => line.replace(/^[\d\-\*•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  // Step 4: Generate summary
  console.log('Step 4: Generating summary report...');
  const step4 = await session.send(
    'Provide a brief executive summary of the incident and resolution plan in 2-3 sentences.',
    {
      outputFormat: 'json',
    }
  );

  let summary = '';
  let totalCost = 0;

  if (step4.format === 'json') {
    console.log(`  ✓ Completed (${step4.duration_ms}ms)\n`);
    summary = step4.result;
    totalCost = step4.total_cost_usd;
  }

  return {
    severity,
    summary,
    actions,
    cost: totalCost,
  };
}

async function main() {
  console.log('=== Incident Response Automation ===\n');

  const incident = 'High CPU usage detected on production server (95%+) for the past 30 minutes';

  const report = await analyzeIncident(incident);

  console.log('=== INCIDENT REPORT ===\n');
  console.log(`Severity: ${report.severity}`);
  console.log();
  console.log('Summary:');
  console.log(report.summary);
  console.log();
  console.log('Recommended Actions:');
  report.actions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action}`);
  });
  console.log();
  console.log(`Analysis Cost: $${report.cost.toFixed(6)}`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
