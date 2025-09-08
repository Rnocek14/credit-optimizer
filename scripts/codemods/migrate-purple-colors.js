/**
 * JSCodeshift Codemod: Migrate purple-* classes to semantic tokens
 * Usage: npx jscodeshift -t scripts/codemods/migrate-purple-colors.js "src/**/*.{ts,tsx,js,jsx}"
 */

const purpleToSemanticMap = {
  // Text colors
  'text-purple-50': 'text-primary-50',
  'text-purple-100': 'text-primary-100',
  'text-purple-200': 'text-primary-200',
  'text-purple-300': 'text-primary-300',
  'text-purple-400': 'text-primary-400',
  'text-purple-500': 'text-primary-500',
  'text-purple-600': 'text-primary-600',
  'text-purple-700': 'text-primary-700',
  'text-purple-800': 'text-primary-800',
  'text-purple-900': 'text-primary-900',

  // Background colors
  'bg-purple-50': 'bg-primary-50',
  'bg-purple-100': 'bg-primary-100',
  'bg-purple-200': 'bg-primary-200',
  'bg-purple-300': 'bg-primary-300',
  'bg-purple-400': 'bg-primary-400',
  'bg-purple-500': 'bg-primary-500',
  'bg-purple-600': 'bg-primary-600',
  'bg-purple-700': 'bg-primary-700',
  'bg-purple-800': 'bg-primary-800',
  'bg-purple-900': 'bg-primary-900',
  'bg-purple-950': 'bg-primary-900',

  // Border colors
  'border-purple-50': 'border-primary-50',
  'border-purple-100': 'border-primary-100',
  'border-purple-200': 'border-primary-200',
  'border-purple-300': 'border-primary-300',
  'border-purple-400': 'border-primary-400',
  'border-purple-500': 'border-primary-500',
  'border-purple-600': 'border-primary-600',
  'border-purple-700': 'border-primary-700',
  'border-purple-800': 'border-primary-800',
  'border-purple-900': 'border-primary-900',

  // Gradient stops
  'from-purple-50': 'from-primary-50',
  'from-purple-100': 'from-primary-100',
  'from-purple-200': 'from-primary-200',
  'from-purple-300': 'from-primary-300',
  'from-purple-400': 'from-primary-400',
  'from-purple-500': 'from-primary-500',
  'from-purple-600': 'from-primary-600',
  'from-purple-700': 'from-primary-700',
  'from-purple-800': 'from-primary-800',
  'from-purple-900': 'from-primary-900',
  'from-purple-950': 'from-primary-900',

  'to-purple-50': 'to-primary-50',
  'to-purple-100': 'to-primary-100',
  'to-purple-200': 'to-primary-200',
  'to-purple-300': 'to-primary-300',
  'to-purple-400': 'to-primary-400',
  'to-purple-500': 'to-primary-500',
  'to-purple-600': 'to-primary-600',
  'to-purple-700': 'to-primary-700',
  'to-purple-800': 'to-primary-800',
  'to-purple-900': 'to-primary-900',
  'to-purple-950': 'to-primary-900',

  'via-purple-50': 'via-primary-50',
  'via-purple-100': 'via-primary-100',
  'via-purple-200': 'via-primary-200',
  'via-purple-300': 'via-primary-300',
  'via-purple-400': 'via-primary-400',
  'via-purple-500': 'via-primary-500',
  'via-purple-600': 'via-primary-600',
  'via-purple-700': 'via-primary-700',
  'via-purple-800': 'via-primary-800',
  'via-purple-900': 'via-primary-900',

  // Colors with opacity
  'bg-purple-500/10': 'bg-primary-500/10',
  'bg-purple-500/20': 'bg-primary-500/20',
  'bg-purple-50/10': 'bg-primary-50/10',
  'border-purple-500/20': 'border-primary-500/20',
};

function migrateClassNames(classNameString) {
  if (!classNameString) return classNameString;
  
  let result = classNameString;
  
  Object.entries(purpleToSemanticMap).forEach(([oldClass, newClass]) => {
    const regex = new RegExp(`\\b${oldClass.replace(/[\[\]\/]/g, '\\$&')}\\b`, 'g');
    result = result.replace(regex, newClass);
  });
  
  return result;
}

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const source = j(fileInfo.source);
  let hasChanges = false;

  // Transform className attributes in JSX
  source.find(j.JSXAttribute, {
    name: { name: 'className' }
  }).forEach(path => {
    const value = path.value.value;
    
    if (value && value.type === 'Literal' && typeof value.value === 'string') {
      const original = value.value;
      const migrated = migrateClassNames(original);
      
      if (original !== migrated) {
        value.value = migrated;
        hasChanges = true;
      }
    }
    
    if (value && value.type === 'JSXExpressionContainer' && value.expression.type === 'TemplateLiteral') {
      const templateLiteral = value.expression;
      templateLiteral.quasis.forEach(quasi => {
        const original = quasi.value.raw;
        const migrated = migrateClassNames(original);
        
        if (original !== migrated) {
          quasi.value.raw = migrated;
          quasi.value.cooked = migrated;
          hasChanges = true;
        }
      });
    }
  });

  // Transform template literals that might contain Tailwind classes
  source.find(j.TemplateLiteral).forEach(path => {
    path.value.quasis.forEach(quasi => {
      const original = quasi.value.raw;
      const migrated = migrateClassNames(original);
      
      if (original !== migrated) {
        quasi.value.raw = migrated;
        quasi.value.cooked = migrated;
        hasChanges = true;
      }
    });
  });

  // Transform string literals that might contain class names
  source.find(j.Literal).forEach(path => {
    if (typeof path.value.value === 'string') {
      const original = path.value.value;
      
      // Only transform if it looks like it contains Tailwind classes
      if (/\b(bg|text|border)-purple-\d+/.test(original)) {
        const migrated = migrateClassNames(original);
        
        if (original !== migrated) {
          path.value.value = migrated;
          hasChanges = true;
        }
      }
    }
  });

  if (hasChanges) {
    console.log(`✅ Migrated purple classes in: ${fileInfo.path}`);
  }

  return hasChanges ? source.toSource() : null;
};

module.exports.parser = 'tsx';