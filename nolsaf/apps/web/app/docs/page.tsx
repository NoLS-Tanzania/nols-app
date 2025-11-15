import React from 'react';
 
const mockDocs = [
  { id: '1', title: 'User Guide', url: '/assets/docs/user-guide.pdf' },
  { id: '2', title: 'API Reference', url: '/assets/docs/api-reference.pdf' },
];

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-4">Docs</h1>
      <p className="mb-4">Below are uploaded documents you can view or download.</p>

      <ul className="space-y-2">
        {mockDocs.map(d => (
          <li key={d.id} className="flex items-center justify-between border rounded p-3">
            <div>
              <div className="font-medium">{d.title}</div>
              <div className="text-sm text-gray-600">PDF document</div>
            </div>
            <div className="flex items-center gap-2">
              <a className="btn btn-outline" href={d.url} target="_blank" rel="noreferrer">Open</a>
              <a className="btn btn-ghost" href={d.url} download>Download</a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
