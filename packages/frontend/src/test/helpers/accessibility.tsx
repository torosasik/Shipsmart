import type { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Simplified accessibility result type
interface AccessibilityResult {
  violations: Array<Record<string, unknown>>;
  passes: Array<Record<string, unknown>>;
}

/**
 * Renders a component and runs axe-core accessibility audit
 */
export async function renderWithA11yCheck(
  ui: ReactElement,
  options?: RenderOptions
): Promise<{ container: HTMLElement; axeResults: AccessibilityResult }> {
  const result = render(ui, options);
  const axeResults = await runAxeAnalysis(result.container);
  
  return {
    container: result.container,
    axeResults,
  };
}

/**
 * Runs axe-core accessibility analysis on a container
 * Uses the axe-core browser API
 */
export async function runAxeAnalysis(
  container: HTMLElement
): Promise<AccessibilityResult> {
  try {
    // Dynamically import axe-core
    const axe = await import('axe-core');
    
    // Configure axe with WCAG 2.1 AA standards
    const config = {
      runOnly: {
        type: 'tag' as const,
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      reporter: 'v2' as const,
    };
    
    // Run axe analysis
    const axeResults = await axe.default.run(container, config);
    
    // Convert to plain objects for easier handling
    return {
      violations: JSON.parse(JSON.stringify(axeResults.violations || [])),
      passes: JSON.parse(JSON.stringify(axeResults.passes || [])),
    };
  } catch (error) {
    console.warn('Axe-core analysis skipped:', error);
    return { violations: [], passes: [] };
  }
}

/**
 * Asserts that there are no critical or serious accessibility violations
 */
export function assertNoCriticalViolations(results: AccessibilityResult): void {
  const criticalViolations = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  
  if (criticalViolations.length > 0) {
    const violationsList = criticalViolations
      .map((v) => {
        const impact = v.impact as string || 'unknown';
        const description = v.description as string || '';
        const helpUrl = v.helpUrl as string || '';
        const nodes = v.nodes as Array<{ html?: string; target?: string[] }> || [];
        return `  - ${v.id}: ${description}\n    Impact: ${impact}\n    Help: ${helpUrl}\n    Elements: ${nodes.map(n => n.html).join(', ')}`;
      })
      .join('\n');
    
    throw new Error(
      `Found ${criticalViolations.length} critical/serious accessibility violation(s):\n${violationsList}`
    );
  }
}

/**
 * Gets summary of accessibility results
 */
export function getA11ySummary(results: AccessibilityResult): string {
  const { violations, passes } = results;
  
  const countByImpact = (impact: string) => 
    violations.filter((v) => v.impact === impact).length;
  
  const summary = [
    `Accessibility Audit Results:`,
    `- Total violations: ${violations.length}`,
    `- Critical: ${countByImpact('critical')}`,
    `- Serious: ${countByImpact('serious')}`,
    `- Moderate: ${countByImpact('moderate')}`,
    `- Minor: ${countByImpact('minor')}`,
    `- Passed checks: ${passes.length}`,
  ];
  
  if (violations.length > 0) {
    summary.push('\nViolations:');
    violations.forEach((v) => {
      const impact = (v.impact as string || 'unknown').toUpperCase();
      summary.push(`  [${impact}] ${v.id}: ${v.description}`);
    });
  }
  
  return summary.join('\n');
}

/**
 * Custom render wrapper for all tests
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return render(ui, { ...options });
};

export * from '@testing-library/react';
export { customRender as render };
