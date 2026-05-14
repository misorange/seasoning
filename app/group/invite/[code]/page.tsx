import Link from "next/link";
import { InviteJoinForm } from "../../../_components/group-entry";

type InvitePageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const inviteCode = decodeURIComponent(code);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-12 sm:px-8">
        <header className="flex items-center justify-between border-b border-gray-100 pb-8">
          <Link href="/" className="text-xl font-medium tracking-tight text-gray-800">
            Seasoning
          </Link>
          <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">
            invite
          </p>
        </header>

        <section className="flex flex-1 items-center py-10">
          <div className="w-full">
            <InviteJoinForm inviteCode={inviteCode} lockedCode />
          </div>
        </section>
      </div>
    </main>
  );
}
