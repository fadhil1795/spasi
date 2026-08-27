"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Operator {
  id: string;
  name: string;
  licenseNo: string | null;
  skills: string | null;
  status: string;
  validUntil: string | null;
}

export default function OperatorManagementPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/operators");
      const data = await res.json();
      setOperators(data);
    } catch (error) {
      console.error("Failed to fetch operators:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Tersedia</span>;
      case "ON_DUTY":
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Bertugas</span>;
      case "INACTIVE":
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Nonaktif</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Operator / Teknisi</h2>
          <p className="text-muted-foreground">
            Kelola data tenaga ahli, sopir, atau teknisi yang tersedia untuk mendampingi penyewaan aset.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Tambah Operator
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold">Daftar Operator & Driver</h2>
        </div>
        <div className="p-6">
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Keahlian</th>
                  <th className="px-4 py-3 font-medium">No. Lisensi / SIM</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Masa Berlaku Lisensi</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : operators.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Belum ada data operator
                    </td>
                  </tr>
                ) : (
                  operators.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{op.name}</td>
                      <td className="px-4 py-3">{op.skills || "-"}</td>
                      <td className="px-4 py-3">{op.licenseNo || "-"}</td>
                      <td className="px-4 py-3">{getStatusBadge(op.status)}</td>
                      <td className="px-4 py-3">
                        {op.validUntil 
                          ? format(new Date(op.validUntil), "dd MMM yyyy", { locale: localeId })
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="h-8 w-8 text-blue-600 p-1 mr-2 rounded hover:bg-blue-50 inline-flex items-center justify-center">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="h-8 w-8 text-red-600 p-1 rounded hover:bg-red-50 inline-flex items-center justify-center">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
