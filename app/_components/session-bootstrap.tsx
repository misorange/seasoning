"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  getMembershipClaimsFromAccessToken,
  hasMembershipClaims,
} from "@/utils/supabase/session";

export function SessionBootstrap() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    // proxy.ts（サーバーサイド）が既に匿名セッションを作成しているので、
    // クライアント側での自動作成は行わない。
    // onAuthStateChange のみ登録し、Google認証後の処理を行う。

    const currentPath = window.location.pathname;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const anonymousUserId = localStorage.getItem('anonymousUserId');
        if (!anonymousUserId || anonymousUserId === session.user.id) {
          // 匿名→Google移行の対象ではない（通常のログイン）
          // Googleアカウントに既存データがあればそのまま使える
          supabase.auth.refreshSession().then((result) => {
            if (!active) return;
            const newSession = result?.data?.session;
            if (newSession) {
              const claims = getMembershipClaimsFromAccessToken(newSession.access_token);
              if (hasMembershipClaims(claims) && currentPath === "/") {
                router.replace("/group");
                router.refresh();
              }
            }
          }).catch(() => {});
          return;
        }

        // 匿名データをGoogleアカウントに移行（既存データがあってもマージ）
        Promise.resolve(
          supabase.rpc('migrate_anonymous_data', {
            p_old_user_id: anonymousUserId,
            p_new_user_id: session.user.id,
          })
        ).then(() => {
          localStorage.removeItem('anonymousUserId');
          return supabase.auth.refreshSession();
        }).then((result) => {
          if (!active) return;
          const newSession = result?.data?.session;
          if (newSession) {
            const claims = getMembershipClaimsFromAccessToken(newSession.access_token);
            if (hasMembershipClaims(claims) && currentPath === "/") {
              router.replace("/group");
              router.refresh();
              return;
            }
          }
          router.refresh();
        }).catch((error) => {
          console.error('Failed to migrate anonymous data:', error);
          localStorage.removeItem('anonymousUserId');
        });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
