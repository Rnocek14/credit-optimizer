/**
 * EduTree V4 - Route entry point
 * ADR 004: Isolate V4 in its own namespace
 * Route-based feature flag: /edu-tree-v4 serves as the explicit opt-in
 */

import React from 'react';

const EduTreeV4Page = React.lazy(() => import('./EduTreeV4Page'));

export default EduTreeV4Page;
