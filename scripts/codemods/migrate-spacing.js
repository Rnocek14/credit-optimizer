/**
 * JSCodeshift Codemod: Migrate arbitrary spacing to design system tokens
 * Usage: npx jscodeshift -t scripts/codemods/migrate-spacing.js "src/**/*.{ts,tsx,js,jsx}"
 */

const spacingMigrationMap = {
  // Padding migrations - arbitrary values to tokens
  'p-[3px]': 'p-1',
  'p-[6px]': 'p-1.5',  
  'p-[10px]': 'p-2.5',
  'p-[14px]': 'p-3.5',
  'p-[18px]': 'p-4.5',
  'p-[22px]': 'p-5.5',
  'px-[3px]': 'px-1',
  'px-[6px]': 'px-1.5',
  'px-[10px]': 'px-2.5',
  'px-[14px]': 'px-3.5', 
  'py-[3px]': 'py-1',
  'py-[6px]': 'py-1.5',
  'py-[10px]': 'py-2.5',
  'pt-[3px]': 'pt-1',
  'pb-[3px]': 'pb-1',
  'pl-[3px]': 'pl-1',
  'pr-[3px]': 'pr-1',
  
  // Margin migrations
  'm-[3px]': 'm-1',
  'm-[6px]': 'm-1.5',
  'm-[10px]': 'm-2.5',
  'm-[14px]': 'm-3.5',
  'mx-[3px]': 'mx-1',
  'mx-[6px]': 'mx-1.5',
  'my-[3px]': 'my-1',
  'my-[6px]': 'my-1.5',
  'mt-[3px]': 'mt-1',
  'mb-[3px]': 'mb-1',
  'ml-[3px]': 'ml-1',
  'mr-[3px]': 'mr-1',
  
  // Gap migrations
  'gap-[6px]': 'gap-1.5',
  'gap-[10px]': 'gap-2.5',
  'gap-[14px]': 'gap-3.5',
  'gap-x-[6px]': 'gap-x-1.5',
  'gap-y-[6px]': 'gap-y-1.5',
  
  // Width/height migrations for touch targets
  'w-[44px]': 'w-11',
  'h-[44px]': 'h-11', 
  'min-w-[44px]': 'min-w-11',
  'min-h-[44px]': 'min-h-11',
  'w-[48px]': 'w-12',
  'h-[48px]': 'h-12',
  'w-[52px]': 'w-13',
  'h-[52px]': 'h-13',
  
  // Common arbitrary values to nearest tokens
  'p-2.5': 'p-3',     // 10px -> 12px (prefer standard grid)
  'p-3.5': 'p-4',     // 14px -> 16px
  'p-5.5': 'p-6',     // 22px -> 24px
  'm-2.5': 'm-3',
  'm-3.5': 'm-4',
  'gap-7': 'gap-8',   // 28px -> 32px (prefer 8pt grid)
  'gap-9': 'gap-10',  // 36px -> 40px
  'gap-11': 'gap-12', // 44px -> 48px
  
  // Height adjustments for WCAG compliance
  'h-8': 'h-11',      // 32px -> 44px for interactive elements
  'h-9': 'h-11',      // 36px -> 44px for interactive elements
  'h-10': 'h-11',     // 40px -> 44px for interactive elements
  
  // Legacy spacing to tokens
  'p-[16px]': 'p-4',
  'p-[24px]': 'p-6',
  'p-[32px]': 'p-8',
  'm-[16px]': 'm-4',
  'm-[24px]': 'm-6',
  'm-[32px]': 'm-8',
};

// Interactive element patterns that need touch target compliance
const interactiveElementPatterns = [
  'Button',
  'button',
  'IconButton', 
  'Tab',
  'MenuItem',
  'Link',
  'a',
  'input[type="button"]',
  'input[type="submit"]',
];

function migrateSpacingClasses(classNameString) {
  if (!classNameString) return classNameString;
  
  let result = classNameString;
  
  Object.entries(spacingMigrationMap).forEach(([oldClass, newClass]) => {
    const regex = new RegExp(`\\b${oldClass.replace(/[\[\]]/g, '\\$&')}\\b`, 'g');
    result = result.replace(regex, newClass);
  });
  
  return result;
}

function shouldEnforceTouchTarget(elementType, classNames) {
  const isInteractive = interactiveElementPatterns.some(pattern => 
    elementType.includes(pattern)
  );
  
  const hasHeightClass = /\b(h-\d+|min-h-\d+)\b/.test(classNames);
  const hasSmallHeight = /\b(h-[1-9]|h-10)\b/.test(classNames);
  
  return isInteractive && (!hasHeightClass || hasSmallHeight);
}

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const source = j(fileInfo.source);
  let hasChanges = false;

  // Transform className attributes in JSX
  source.find(j.JSXElement).forEach(path => {
    const elementName = path.value.openingElement.name.name;
    
    // Find className attribute
    const classNameAttr = path.value.openingElement.attributes?.find(
      attr => attr.type === 'JSXAttribute' && attr.name?.name === 'className'
    );
    
    if (classNameAttr?.value) {
      let originalClasses = '';
      let migratedClasses = '';
      
      if (classNameAttr.value.type === 'Literal') {
        originalClasses = classNameAttr.value.value;
        migratedClasses = migrateSpacingClasses(originalClasses);
        
        // Enforce touch targets for interactive elements
        if (shouldEnforceTouchTarget(elementName, migratedClasses)) {
          if (!migratedClasses.includes('min-h-11')) {
            migratedClasses = `${migratedClasses} min-h-11`.trim();
          }
        }
        
        if (originalClasses !== migratedClasses) {
          classNameAttr.value.value = migratedClasses;
          hasChanges = true;
        }
      }
      
      if (classNameAttr.value.type === 'JSXExpressionContainer' && 
          classNameAttr.value.expression.type === 'TemplateLiteral') {
        const templateLiteral = classNameAttr.value.expression;
        templateLiteral.quasis.forEach(quasi => {
          const original = quasi.value.raw;
          const migrated = migrateSpacingClasses(original);
          
          if (original !== migrated) {
            quasi.value.raw = migrated;
            quasi.value.cooked = migrated;
            hasChanges = true;
          }
        });
      }
    }
  });

  // Transform cn() and clsx() function calls
  source.find(j.CallExpression, {
    callee: { name: 'cn' }
  }).forEach(path => {
    path.value.arguments.forEach(arg => {
      if (arg.type === 'Literal' && typeof arg.value === 'string') {
        const original = arg.value;
        const migrated = migrateSpacingClasses(original);
        
        if (original !== migrated) {
          arg.value = migrated;
          hasChanges = true;
        }
      }
      
      if (arg.type === 'TemplateLiteral') {
        arg.quasis.forEach(quasi => {
          const original = quasi.value.raw;
          const migrated = migrateSpacingClasses(original);
          
          if (original !== migrated) {
            quasi.value.raw = migrated;
            quasi.value.cooked = migrated;
            hasChanges = true;
          }
        });
      }
    });
  });

  if (hasChanges) {
    console.log(`✅ Migrated spacing classes in: ${fileInfo.path}`);
  }

  return hasChanges ? source.toSource() : null;
};

module.exports.parser = 'tsx';