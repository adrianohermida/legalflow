/**
 * BUILDER.IO EMERGENCY FIX
 * 
 * This file ensures all components exist to prevent Builder.io 
 * from generating empty placeholder components.
 */

// Import the emergency component
import MyComponent from '../MyComponent';

// List of components that Builder.io might be looking for
const BUILDER_COMPONENT_REGISTRY = {
  MyComponent,
  // Add other components that might be referenced by Builder.io
};

// Ensure all components are available globally for Builder.io
if (typeof window !== 'undefined') {
  (window as any).BuilderComponents = BUILDER_COMPONENT_REGISTRY;
  
  console.log('🔧 Builder.io component registry initialized:', Object.keys(BUILDER_COMPONENT_REGISTRY));
}

// Export for use in main app
export default BUILDER_COMPONENT_REGISTRY;
export { MyComponent };
