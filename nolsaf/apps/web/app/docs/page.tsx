import React from 'react';
 
export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-4">Docs</h1>
      <p className="mb-4">Below are uploaded documents you can view or download.</p>

      <ul className="space-y-2">
        {/* Documents will be loaded from API */}
        <li className="text-gray-500 text-center py-8">No documents available</li>
      </ul>
    </div>
  );
}
