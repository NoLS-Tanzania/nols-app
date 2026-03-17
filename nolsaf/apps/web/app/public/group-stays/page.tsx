import type { Metadata } from "next";
import React from 'react';
import GroupStaysCard from '../../../components/GroupStaysCard';

export const metadata: Metadata = {
  title: "Group Stays",
  description:
    "Book group accommodation across East Africa with NoLSAF — coordinated multi-room stays, driver assignment, and flexible payments for groups of any size.",
  openGraph: {
    title: "Group Stays | NoLSAF",
    description: "Multi-room group bookings made simple — verified properties, coordinated transport, and group rates across Tanzania.",
  },
};

export default function GroupStaysPage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-20">
      <div className="public-container">
        <GroupStaysCard />
      </div>
    </main>
  );
}
