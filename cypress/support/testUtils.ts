/**
 * Test utilities for seeding data and stubbing telemetry
 */

/**
 * Seed a satisfied module in the plan store
 * This ensures we have at least one module with all requirements met for exploration testing
 */
export function seedSatisfiedModule() {
  cy.window().then((win) => {
    // Access the Zustand store
    const storageKey = 'v5-plan';
    const existingData = win.localStorage.getItem(storageKey);
    
    let storeData: any = { state: { selections: {}, semesters: {} }, version: 0 };
    if (existingData) {
      try {
        storeData = JSON.parse(existingData);
      } catch (e) {
        console.warn('Failed to parse existing store data', e);
      }
    }

    // Seed data for a typical satisfied module
    // Example: CS Programming module (y1-spring-cs-programming)
    storeData.state.selections = {
      ...storeData.state.selections,
      'cs-programming-requirement': {
        selected: ['CS101'],
        selectedCredits: 3
      }
    };

    storeData.state.semesters = {
      ...storeData.state.semesters,
      '1-fall': {
        courseIds: ['CS101'],
        credits: 3,
        workloadHours: 9
      }
    };

    win.localStorage.setItem(storageKey, JSON.stringify(storeData));
  });
}

/**
 * Clear all plan data
 */
export function clearPlanStore() {
  cy.window().then((win) => {
    win.localStorage.removeItem('v5-plan');
  });
}

/**
 * Stub telemetry logging for deterministic testing
 * Exposes window.__telemetryEvents array for assertions
 */
export function stubTelemetry() {
  cy.window().then((win) => {
    // @ts-ignore
    win.__telemetryEvents = [];
    
    // Stub the logEvent function
    // @ts-ignore
    win.__logEvent = (eventName: string, payload: Record<string, unknown>) => {
      // @ts-ignore
      win.__telemetryEvents.push({ eventName, payload });
      console.log('[Telemetry]', eventName, payload);
    };
  });
}

/**
 * Assert that a telemetry event was logged
 */
export function assertTelemetryEvent(
  eventName: string, 
  expectedPayload?: Partial<Record<string, unknown>>
) {
  cy.window().then((win) => {
    // @ts-ignore
    const events = win.__telemetryEvents || [];
    const matchingEvents = events.filter((e: any) => e.eventName === eventName);
    
    expect(matchingEvents.length).to.be.greaterThan(0, `Event "${eventName}" was not logged`);
    
    if (expectedPayload) {
      const matchingEvent = matchingEvents.find((e: any) => {
        return Object.entries(expectedPayload).every(([key, value]) => {
          return e.payload[key] === value;
        });
      });
      
      expect(matchingEvent).to.exist;
    }
  });
}

/**
 * Force A/B bucket assignment
 */
export function forceABBucket(bucket: 'A' | 'B' | null) {
  cy.window().then((win) => {
    if (bucket === null) {
      win.localStorage.removeItem('v5_exploration_mode');
    } else {
      const value = bucket === 'B' ? 'true' : 'false';
      win.localStorage.setItem('v5_exploration_mode', value);
    }
  });
}

/**
 * Wait for module nodes to render
 */
export function waitForModuleNodes() {
  cy.get('[data-testid="module-node"]', { timeout: 10000 }).should('exist');
}

/**
 * Open templates panel for first module
 */
export function openFirstModuleTemplates() {
  waitForModuleNodes();
  cy.get('[data-testid="module-node"]').first().click();
  cy.get('[role="tab"]').contains(/templates/i).click();
}
