import type { Metadata } from 'next';
import { ContentPage, type ContentSection } from '@/components/layout/ContentPage';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
    title: '利用規約',
    description: `${siteConfig.name}の利用規約です。`,
    alternates: { canonical: '/terms' },
    openGraph: { url: '/terms' },
};

const sections: ContentSection[] = [
    {
        heading: '第1条（適用）',
        paragraphs: [
            `本規約は、${siteConfig.name}（以下「本サービス」）の利用に関する条件を定めるものです。本サービスを利用した時点で、本規約に同意したものとみなします。`,
        ],
    },
    {
        heading: '第2条（サービス内容）',
        paragraphs: [
            '本サービスは、登録不要で利用できる日程調整機能（イベントの作成・回答・集計・CSVおよびICSファイルの出力・イベントの編集）を無料で提供します。',
        ],
    },
    {
        heading: '第3条（編集キーの管理）',
        paragraphs: [
            '編集キーの管理は利用者の責任で行ってください。編集キーの紛失・漏えいにより生じた損害について、運営者は責任を負いません。運営者は編集キーを復元することができません。',
        ],
    },
    {
        heading: '第4条（禁止事項）',
        items: [
            '法令または公序良俗に違反する行為',
            '他者の権利を侵害する情報、差別的・暴力的な情報、個人を特定できる機微な情報の投稿',
            '本サービスのサーバーに過度な負荷をかける行為、不正アクセス、自動化された大量リクエスト',
            '本サービスを利用した営業・宣伝・勧誘（運営者が認めたものを除く）',
            'その他、運営者が不適切と判断する行為',
        ],
    },
    {
        heading: '第5条（コンテンツの削除・利用停止）',
        paragraphs: [
            '運営者は、利用者が本規約に違反した場合、または運営上必要と判断した場合、事前の通知なくイベント・回答を削除し、または本サービスの利用を制限することがあります。',
        ],
    },
    {
        heading: '第6条（サービスの変更・停止）',
        paragraphs: [
            '運営者は、事前の通知なく本サービスの内容を変更し、または提供を中断・終了することがあります。これにより利用者に生じた損害について、運営者は責任を負いません。',
        ],
    },
    {
        heading: '第7条（免責事項）',
        paragraphs: [
            '運営者は、本サービスに事実上または法律上の瑕疵がないことを保証しません。データの消失、日程調整の結果、利用者間のトラブル等について、運営者の故意または重過失による場合を除き責任を負いません。',
        ],
    },
    {
        heading: '第8条（規約の変更）',
        paragraphs: ['運営者は必要に応じて本規約を変更できるものとします。変更後の規約は本ページに掲載した時点で効力を生じます。'],
    },
    {
        heading: '第9条（準拠法・管轄）',
        paragraphs: ['本規約の解釈には日本法を準拠法とし、本サービスに関して紛争が生じた場合は、運営者の所在地を管轄する裁判所を専属的合意管轄とします。'],
    },
];

export default function TermsPage() {
    return <ContentPage title="利用規約" updatedAt="制定日: 2026年9月24日" sections={sections} />;
}
