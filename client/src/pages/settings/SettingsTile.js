import { useState } from "react";
import { Home, FileText, Upload, Settings, ClipboardList, BarChart, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";

export default function Navigation() {
  const [selectedStore, setSelectedStore] = useState("Store 1");
  const [activePage, setActivePage] = useState("Dashboard");

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <nav className="w-64 bg-gray-900 text-white p-4 space-y-4">
        <NavButton icon={<Home />} label="Dashboard" onClick={() => setActivePage("Dashboard")} />
        <NavButton icon={<FileText />} label="Invoice Log" onClick={() => setActivePage("Invoice Log")} />
        <NavButton icon={<Upload />} label="Submit Invoice" onClick={() => setActivePage("Submit Invoice")} />
        <NavButton icon={<Settings />} label="Settings" onClick={() => setActivePage("Settings")} />
        <NavButton icon={<ClipboardList />} label="PAC" onClick={() => setActivePage("PAC")} />
        <NavButton icon={<BarChart />} label="Reports" onClick={() => setActivePage("Reports")} />
      </nav>

      <div className="flex-1 flex flex-col">
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between bg-white shadow p-4">
          {/* Store Selection */}
          <Select value={selectedStore} onValueChange={setSelectedStore} className="w-48">
            <SelectItem value="Store 1">Store 1</SelectItem>
            <SelectItem value="Store 2">Store 2</SelectItem>
            <SelectItem value="Store 3">Store 3</SelectItem>
          </Select>

          {/* Account Button */}
          <Button variant="ghost">
            <User className="mr-2" /> Account
          </Button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 bg-gray-100 p-6">
          {activePage === "Settings" ? <SettingsPage /> : <h1>{activePage} Page</h1>}
        </main>
      </div>
    </div>
  );
}

function NavButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center space-x-3 p-3 w-full rounded-lg hover:bg-gray-800">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SettingsPage() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <SettingsTile title="User Management" />
      <SettingsTile title="Store Management" />
      <SettingsTile title="Notifications" />
      <SettingsTile title="Invoice Settings" />
    </div>
  );
}

function SettingsTile({ title }) {
  return (
    <div className="p-6 bg-white shadow rounded-lg text-center hover:shadow-lg transition">
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
