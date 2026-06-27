import json

from sqlalchemy.orm import Session
from app.models.qa import Question, Answer, Feedback


FALLBACK_PROMPT_STARTS = (
    "Tell me about your overall experience working as",
    "Describe a challenging project you built as",
    "How do you design systems or pipelines related to",
    "Explain a technical problem you faced in",
    "How do you measure success and impact for work you do as",
)


def create_questions_for_interview(db: Session, interview_id: int, prompts: list[dict]) -> list[Question]:
    created = []
    for p in prompts:
        meta = p.get("meta")
        if isinstance(meta, (dict, list)):
            meta = json.dumps(meta)
        q = Question(interview_id=interview_id, prompt=p.get("prompt"), meta=meta)
        db.add(q)
        created.append(q)
    db.commit()
    for q in created:
        db.refresh(q)
    return created


def list_questions_for_interview(db: Session, interview_id: int) -> list[Question]:
    return db.query(Question).filter(Question.interview_id == interview_id).order_by(Question.id).all()


def has_answers_for_interview(db: Session, interview_id: int) -> bool:
    return db.query(Answer.id).filter(Answer.interview_id == interview_id).first() is not None


def questions_are_fallback(items: list[Question]) -> bool:
    if not items:
        return False
    return all(any(q.prompt.startswith(start) for start in FALLBACK_PROMPT_STARTS) for q in items)


def delete_questions_for_interview(db: Session, interview_id: int) -> None:
    db.query(Question).filter(Question.interview_id == interview_id).delete(synchronize_session=False)
    db.commit()


def save_answer(db: Session, interview_id: int, question_id: int, user_text: str, confidence: float | None = None) -> Answer:
    a = Answer(interview_id=interview_id, question_id=question_id, user_text=user_text, confidence=confidence)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def save_feedback(db: Session, interview_id: int, question_id: int | None, score: float, feedback_text: str) -> Feedback:
    f = Feedback(interview_id=interview_id, question_id=question_id, score=score, feedback_text=feedback_text)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f
