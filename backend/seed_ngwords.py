"""
NGワードサンプルデータ 100件投入スクリプト
使い方: python seed_ngwords.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models import NGWord, now_jst
from datetime import timedelta
import random

random.seed(42)

NG_WORDS = [
    # ── 暴言・侮辱系 ─────────────────────────────
    "バカヤロウ",
    "アホンダラ",
    "クソ野郎",
    "ゴミ人間",
    "カスが",
    "雑魚め",
    "キチガイ",
    "ゴキブリ野郎",
    "豚野郎",
    "死ね死ね",
    "うせろ",
    "消えろ",
    "失せろ",
    "黙れカス",
    "役立たず",
    "のろま",
    "ブス",
    "ブサイク",
    "デブ",
    "ハゲ",
    "チビ",
    "キモオタ",
    "ニートが",
    "引きこもり野郎",
    "無能が",
    "底辺",
    "負け犬",
    "ゴミカス",
    "最低人間",
    "人間のクズ",

    # ── 差別・ヘイト系 ────────────────────────────
    "外国人出て行け",
    "移民反対",
    "帰れ外国人",
    "人種差別",
    "女のくせに",
    "男のくせに",
    "障害者のくせに",
    "老害",
    "ゆとりは使えない",
    "Z世代ゴミ",
    "氷河期負け組",
    "貧乏人は黙れ",
    "田舎者め",
    "低学歴が",
    "高卒は黙れ",

    # ── スパム・広告系 ────────────────────────────
    "出会い系",
    "LINE交換しよう",
    "副業で稼げる",
    "在宅ワーク募集",
    "簡単に稼げる",
    "月収100万",
    "無料プレゼント",
    "クリックして稼ぐ",
    "友達追加で",
    "チャンネル登録",
    "マルチ商法",
    "ネットワークビジネス",
    "情報商材",
    "FX必勝法",
    "仮想通貨必勝",
    "投資で儲かる",
    "無料体験",
    "登録するだけ",
    "詐欺サイト",
    "フィッシング",
    "ウイルス配布",
    "不正アクセス",
    "架空請求",
    "振り込め詐欺",
    "出会い求む",

    # ── 不適切コンテンツ系 ────────────────────────
    "グロ画像",
    "自殺方法",
    "薬物入手",
    "覚醒剤",
    "大麻購入",
    "援助交際",
    "売春",
    "わいせつ",
    "爆弾の作り方",
    "武器購入",
    "闇金",
    "裏カジノ",
    "違法薬物",
    "不法投棄",
    "脱税方法",

    # ── 荒らし・煽り・脅迫系 ──────────────────────
    "全員死ね",
    "爆発しろ",
    "通報済み",
    "個人情報晒す",
    "特定した",
    "住所晒し",
    "身バレさせる",
    "ストーカーする",
    "嫌がらせしてやる",
    "リアルで殺す",
    "家に行く",
    "絶対許さない",
    "報復する",
    "訴えてやる",
    "炎上させる",
]

assert len(NG_WORDS) == 100, f"NGワードは100件必要です（現在: {len(NG_WORDS)}件）"


def run():
    db = SessionLocal()
    try:
        added = 0
        skipped = 0
        for i, word in enumerate(NG_WORDS):
            exists = db.query(NGWord).filter(NGWord.word == word).first()
            if exists:
                skipped += 1
                continue
            offset = timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
            db.add(NGWord(word=word, created_at=now_jst() - offset))
            added += 1

        db.commit()
        total = db.query(NGWord).count()
        print(f"✓ 追加: {added}件 / スキップ（重複）: {skipped}件")
        print(f"✅ NGワード合計: {total}件")
    finally:
        db.close()


if __name__ == "__main__":
    run()
