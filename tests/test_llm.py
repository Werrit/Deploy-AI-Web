import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from core.llm import RAGChatbot, load_chunks


class PromptTest(unittest.TestCase):
    def test_title_only_chunk_is_not_retrieved_instead_of_policy(self):
        with TemporaryDirectory() as folder:
            Path(folder, "doi_tra.md").write_text(
                "# Chính sách đổi trả ShopLite\n\n## Thời hạn đổi trả\nĐổi trả trong 7 ngày.\n",
                encoding="utf-8",
            )
            chunks = load_chunks(Path(folder))
        self.assertEqual(len(chunks), 1)
        self.assertIn("Đổi trả trong 7 ngày.", chunks[0]["text"])

    def test_answer_prompt_uses_policy_without_file_name(self):
        bot = RAGChatbot.__new__(RAGChatbot)
        messages = bot._messages(
            "Chính sách đổi trả như nào?",
            [{"source": "doi_tra.md", "text": "Đổi trả trong 7 ngày.", "score": 0.9}],
            None,
        )
        prompt = messages[0]["content"]
        self.assertIn("Đổi trả trong 7 ngày.", prompt)
        self.assertNotIn("doi_tra.md", prompt)
        self.assertNotIn("tên_file", prompt)


if __name__ == "__main__":
    unittest.main()
