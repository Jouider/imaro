import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getLeads,
  createLead,
  updateLeadStatus,
  convertLead,
  type Lead,
  type LeadConvertResult,
} from "../lib/api";
import { CredentialsResult } from "../components/CredentialsResult";

const STATUTS = ["nouveau", "contacte", "demo_planifiee", "gagne", "perdu"];
const SOURCES = ["site", "salon", "recommandation", "appel", "autre"];

const STATUT_STYLE: Record<string, string> = {
  nouveau: "bg-slate-100 text-slate-600",
  contacte: "bg-blue-100 text-blue-700",
  demo_planifiee: "bg-amber-100 text-amber-700",
  gagne: "bg-green-100 text-green-700",
  perdu: "bg-red-100 text-red-700",
};

/** Lien mailto pré-rempli pour un email de suivi au prospect (KAN-151). */
function followUpMailto(l: Lead): string {
  const subject = encodeURIComponent(
    `Imaro — suite à votre demande de démo (${l.cabinet_nom})`,
  );
  const body = encodeURIComponent(
    `Bonjour ${l.contact_nom ?? ""},\n\n` +
      `Merci pour votre intérêt pour Imaro. Nous faisons suite à votre demande de démonstration pour ${l.cabinet_nom}.\n\n` +
      `Quand seriez-vous disponible pour un court échange / une démo ?\n\n` +
      `Bien à vous,\nL'équipe Imaro`,
  );
  return `mailto:${l.contact_email ?? ""}?subject=${subject}&body=${body}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function Leads() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    cabinet_nom: "",
    contact_email: "",
    ville: "",
    source: "site",
  });
  // Identifiants du responsable à afficher après conversion (KAN-138).
  const [credResult, setCredResult] = useState<LeadConvertResult | null>(null);
  // Demande de démo ouverte dans le panneau de détail (KAN-151).
  const [detail, setDetail] = useState<Lead | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => getLeads(),
    // Fait remonter les nouvelles demandes de démo sans rechargement manuel
    // (KAN-151 — suivi commercial en quasi temps réel).
    refetchInterval: 60_000,
  });

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["leads"] });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cabinet_nom.trim()) return;
    try {
      await createLead(form);
      setForm({
        cabinet_nom: "",
        contact_email: "",
        ville: "",
        source: "site",
      });
      toast.success("Lead ajouté");
      invalidate();
    } catch {
      toast.error("Échec de l’ajout");
    }
  }

  async function changeStatut(l: Lead, statut: string) {
    try {
      await updateLeadStatus(l.id, statut);
      toast.success(`Statut mis à jour : ${statut}`);
      setDetail((d) => (d && d.id === l.id ? { ...d, statut } : d));
      invalidate();
    } catch {
      toast.error("Échec de la mise à jour du statut");
    }
  }

  async function convertir(l: Lead) {
    try {
      const result = await convertLead(l.id);
      toast.success("Lead converti — identifiants envoyés au responsable");
      setCredResult(result);
      setDetail(null);
      invalidate();
    } catch (e) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Échec",
      );
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Démos & leads</h1>

      <form
        onSubmit={create}
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3"
      >
        <input
          placeholder="Nom du cabinet *"
          value={form.cabinet_nom}
          onChange={(e) => setForm({ ...form, cabinet_nom: e.target.value })}
          className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Email contact"
          value={form.contact_email}
          onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Ville"
          value={form.ville}
          onChange={(e) => setForm({ ...form, ville: e.target.value })}
          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Ajouter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Cabinet</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Chargement…
                </td>
              </tr>
            )}
            {data?.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium">{l.cabinet_nom}</div>
                  <div className="text-xs text-slate-400">{l.ville ?? "—"}</div>
                </td>
                <td className="px-4 py-2">
                  <div>{l.contact_nom ?? "—"}</div>
                  {l.contact_email && (
                    <a
                      href={`mailto:${l.contact_email}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {l.contact_email}
                    </a>
                  )}
                  {l.contact_telephone && (
                    <a
                      href={`tel:${l.contact_telephone}`}
                      className="block text-xs text-slate-400 hover:underline"
                    >
                      {l.contact_telephone}
                    </a>
                  )}
                </td>
                <td className="px-4 py-2 capitalize">{l.source}</td>
                <td className="px-4 py-2">
                  <select
                    value={l.statut}
                    onChange={(e) => changeStatut(l, e.target.value)}
                    disabled={!!l.converted_tenant}
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUT_STYLE[l.statut] ?? ""}`}
                  >
                    {STATUTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDetail(l)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Détails
                    </button>
                    {l.converted_tenant ? (
                      <span className="text-xs text-green-600">
                        → {l.converted_tenant.name}
                      </span>
                    ) : (
                      <button
                        onClick={() => convertir(l)}
                        className="rounded bg-primary px-2 py-1 text-xs text-white"
                      >
                        Convertir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Aucun lead.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{detail.cabinet_nom}</h2>
                <p className="text-xs text-slate-400">
                  Demande reçue le {fmtDate(detail.created_at)} · source{" "}
                  <span className="capitalize">{detail.source}</span>
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
              <dt className="text-slate-400">Contact</dt>
              <dd className="col-span-2">{detail.contact_nom ?? "—"}</dd>
              <dt className="text-slate-400">Email</dt>
              <dd className="col-span-2">
                {detail.contact_email ? (
                  <a
                    href={`mailto:${detail.contact_email}`}
                    className="text-primary hover:underline"
                  >
                    {detail.contact_email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-slate-400">Téléphone</dt>
              <dd className="col-span-2">
                {detail.contact_telephone ? (
                  <a
                    href={`tel:${detail.contact_telephone}`}
                    className="text-primary hover:underline"
                  >
                    {detail.contact_telephone}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-slate-400">Ville</dt>
              <dd className="col-span-2">{detail.ville ?? "—"}</dd>
              <dt className="text-slate-400">Démo prévue</dt>
              <dd className="col-span-2">{fmtDate(detail.date_demo)}</dd>
              <dt className="text-slate-400">Message</dt>
              <dd className="col-span-2 whitespace-pre-wrap">
                {detail.notes?.trim() || (
                  <span className="text-slate-400">Aucun message</span>
                )}
              </dd>
              <dt className="text-slate-400">Statut</dt>
              <dd className="col-span-2">
                <select
                  value={detail.statut}
                  onChange={(e) => changeStatut(detail, e.target.value)}
                  disabled={!!detail.converted_tenant}
                  className={`rounded-full px-2 py-0.5 text-xs ${STATUT_STYLE[detail.statut] ?? ""}`}
                >
                  {STATUTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </dd>
            </dl>

            <div className="flex flex-wrap gap-2 border-t pt-3">
              {detail.contact_email && (
                <a
                  href={followUpMailto(detail)}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
                >
                  ✉️ Email de suivi
                </a>
              )}
              {detail.contact_telephone && (
                <a
                  href={`tel:${detail.contact_telephone}`}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  📞 Appeler
                </a>
              )}
              {!detail.converted_tenant && (
                <button
                  onClick={() => convertir(detail)}
                  className="ms-auto rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary"
                >
                  Convertir en client
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {credResult && (
        <CredentialsResult
          owner={credResult.owner}
          tempPassword={credResult.temp_password}
          onClose={() => setCredResult(null)}
        />
      )}
    </div>
  );
}
