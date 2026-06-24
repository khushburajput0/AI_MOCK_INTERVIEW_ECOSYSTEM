from sqlalchemy.orm import Session
from app.models.qa import Question, Answer, Feedback


def create_questions_for_interview(db: Session, interview_id: int, prompts: list[dict]) -> list[Question]:
    created = []
    for p in prompts:
        q = Question(interview_id=interview_id, prompt=p.get("prompt"), meta=p.get("meta"))
        db.add(q)
        created.append(q)
    db.commit()
    for q in created:
        db.refresh(q)
    return created


def list_questions_for_interview(db: Session, interview_id: int) -> list[Question]:
    return db.query(Question).filter(Question.interview_id == interview_id).order_by(Question.id).all()


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
