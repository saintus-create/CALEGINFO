import Link from "next/link";

import { BrowseShell } from "@/app/_components/browsers/browse-shell";
import manifest from "@/public/corpus/manifest.json";

type CodeDataset = {
  abbr: string;
  name: string;
  sections?: number;
  records?: number;
  updated_by_state?: string;
  sha256?: string;
};

type ExtraDataset = {
  key: string;
  name: string;
  file: string;
  records?: number;
  agencies?: number;
  vendors?: number;
  contracts?: number;
  cases?: number;
  annotations?: number;
  mandatory?: number;
  retrieved_at?: string;
  source?: string;
  official_source?: string;
  sha256?: string;
};

const codes = (manifest.datasets ?? []) as CodeDataset[];
const extras = ((manifest.extras as { datasets?: ExtraDataset[] })?.datasets ?? []) as ExtraDataset[];
const extrasGeneratedAt = (manifest.extras as { generated_at?: string })?.generated_at;

const totalSections = codes.reduce((n, d) => n + (d.sections ?? 0), 0);

const fmtDate = (s?: string) => (s ? s.slice(0, 10) : "not recorded");

// the Codes each carry the state's own "updated_by_state" stamp; show the most
// recent so the column is never blank
type Dated = { label: string; t: number };
const codesAsOf: string = (() => {
  const dated: Dated[] = codes
    .map((c) => c.updated_by_state)
    .filter((v): v is string => Boolean(v))
    .map((label) => ({ label, t: Date.parse(label) }))
    .filter((x) => !Number.isNaN(x.t));
  if (!dated.length) return fmtDate(manifest.generated_at);
  dated.sort((a, b) => b.t - a.t);
  return `${dated[0].label} (latest of ${dated.length})`;
})();

const shortHash = (h?: string) => (h ? `${h.slice(0, 12)}…` : "—");

/** Every figure on this page is read from corpus/manifest.json at build time,
 *  so the page cannot claim a number the corpus does not contain. */
export default function MethodPage() {
  return (
    <BrowseShell active="/method">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-7">
          <p className="text-micro font-medium uppercase text-muted-foreground">Method &amp; sources</p>
          <h1 className="mt-2.5 max-w-[30ch] text-title font-bold text-balance">
            What this covers, how it answers, and what it cannot do
          </h1>

          <p className="mt-5 max-w-[68ch] text-body text-muted-foreground/90">
            This is a research aid over California&rsquo;s own published legal material. It is
            not a lawyer, it is not legal advice, and it is not a live view of the law. Every
            figure below is read directly from the corpus manifest that ships with the site, so
            these numbers describe the data the answers are actually built from.
          </p>

          <h2 className="mt-10 border-t border-border pt-6 text-body font-medium">
            What is in the corpus
          </h2>
          <p className="mt-3 max-w-[68ch] text-body text-muted-foreground/90">
            {codes.length} California Codes and the Constitution — {totalSections.toLocaleString()}{" "}
            sections in total — plus the datasets below. Each carries a content hash, so any
            snapshot can be identified and checked.
          </p>

          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-label">
              <thead className="bg-muted/50 text-micro font-medium uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Dataset</th>
                  <th className="px-3 py-2 font-medium">Records</th>
                  <th className="px-3 py-2 font-medium">As of</th>
                  <th className="px-3 py-2 font-medium">Content hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2">California Codes + Constitution</td>
                  <td className="px-3 py-2 tabular-nums">{totalSections.toLocaleString()} sections</td>
                  <td className="px-3 py-2 text-muted-foreground">{codesAsOf}</td>
                  <td className="px-3 py-2 font-mono text-micro font-normal tracking-normal text-muted-foreground">
                    per code
                  </td>
                </tr>
                {extras.map((d) => {
                  const count =
                    d.records ??
                    d.agencies ??
                    d.cases ??
                    0;
                  const label =
                    d.key === "forms" && d.mandatory
                      ? `${count.toLocaleString()} (${d.mandatory.toLocaleString()} mandatory)`
                      : d.key === "directory" && d.agencies
                        ? `${d.agencies} agencies`
                        : d.key === "famcases"
                          ? `${d.cases ?? 0} cases, ${d.annotations ?? 0} annotations`
                          : count.toLocaleString();
                  return (
                    <tr key={d.key}>
                      <td className="px-3 py-2">{d.name}</td>
                      <td className="px-3 py-2 tabular-nums">{label}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {fmtDate(d.retrieved_at ?? extrasGeneratedAt)}
                      </td>
                      <td className="px-3 py-2 font-mono text-micro font-normal tracking-normal tabular-nums text-muted-foreground">
                        {shortHash(d.sha256)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 className="mt-10 border-t border-border pt-6 text-body font-medium">
            How an answer is produced
          </h2>
          <ol className="mt-3 max-w-[68ch] space-y-3 text-body text-muted-foreground/90">
            <li>
              <span className="font-medium tabular-nums text-foreground">1. Retrieval.</span> Your question is
              turned into targeted searches over the corpus above. Nothing is fetched from the
              live web, so a retrieval is always something that is actually in this snapshot.
            </li>
            <li>
              <span className="font-medium tabular-nums text-foreground">2. An evidence ledger.</span> Before
              any prose is written, the retrieved sources are assembled into a record:
              propositions, the source behind each one, a chronology, and — explicitly — the
              gaps where nothing was found.
            </li>
            <li>
              <span className="font-medium tabular-nums text-foreground">3. A validation gate.</span> The
              drafted answer is checked against that record. A claim citing something that is not
              in the record, or a substantive paragraph with no citation at all, fails the check
              and is retried. If it still fails, the answer is withheld rather than served.
            </li>
          </ol>

          <h2 className="mt-10 border-t border-border pt-6 text-body font-medium">
            What it will not do
          </h2>
          <p className="mt-3 max-w-[68ch] text-body text-muted-foreground/90">
            It will not answer from general knowledge. When the corpus does not contain the
            authority a question needs, the intended behaviour is to say so and name the gap —
            not to produce a confident paragraph. If you see it do otherwise, that is a defect
            worth reporting.
          </p>

          <h2 className="mt-10 border-t border-border pt-6 text-body font-medium">
            Known limits
          </h2>
          <ul className="mt-3 max-w-[68ch] space-y-2 text-body text-muted-foreground/90">
            <li>
              <span className="font-medium text-foreground">It is a snapshot.</span> Codes are as
              of the state&rsquo;s own last update; bills, rules and forms carry their own
              retrieval dates above. A statute amended last week will not be reflected here.
            </li>
            <li>
              <span className="font-medium text-foreground">Citations are guaranteed; reading
              is not.</span> The gate ensures a claim traces to a retrieved source. It cannot
              ensure the model interpreted that source correctly. Verify anything consequential
              against the official text, which is linked from every authority.
            </li>
            <li>
              <span className="font-medium text-foreground">Source gaps are inherited.</span>{" "}
              Where the underlying feed omits something — some Judicial Council forms carry no
              plain-language description, and only some have translations — this site inherits
              that omission rather than filling it in.
            </li>
            <li>
              <span className="font-medium text-foreground">Not legal advice.</span> No
              attorney-client relationship arises from using it. For anything that matters, speak
              to a licensed California attorney.
            </li>
          </ul>

          <h2 className="mt-10 border-t border-border pt-6 text-body font-medium">
            How to check any of this
          </h2>
          <p className="mt-3 max-w-[68ch] text-body text-muted-foreground/90">
            Every authority an answer cites links to the official source —{" "}
            <a className="underline underline-offset-2" href="https://leginfo.legislature.ca.gov/faces/codes.xhtml" target="_blank" rel="noreferrer">
              leginfo.legislature.ca.gov
            </a>{" "}
            for the Codes,{" "}
            <a className="underline underline-offset-2" href="https://www.courts.ca.gov/cms/rules/index.cfm" target="_blank" rel="noreferrer">
              courts.ca.gov
            </a>{" "}
            for the Rules of Court, and{" "}
            <a className="underline underline-offset-2" href="https://selfhelp.courts.ca.gov/find-forms/all-by-category" target="_blank" rel="noreferrer">
              selfhelp.courts.ca.gov
            </a>{" "}
            for the Judicial Council forms. The content hashes above identify the exact snapshot
            an answer was drawn from.
          </p>

          <p className="mt-10 max-w-[68ch] text-label text-muted-foreground">
            Back to the{" "}
            <Link className="underline underline-offset-2" href="/">
              research assistant
            </Link>
            , or browse the{" "}
            <Link className="underline underline-offset-2" href="/codes">
              Codes
            </Link>
            .
          </p>
        </div>
      </div>
    </BrowseShell>
  );
}
