from datetime import date, datetime
from sqlalchemy.orm import Session
from models.nutrition import NutritionProfile, Meal
from models.models import User

ACTIVITY_FACTORS = {
    "sedentary":   1.2,
    "light":       1.375,
    "moderate":    1.55,
    "active":      1.725,
    "very_active": 1.9,
}

GOAL_ADJUSTMENTS = {
    "lose":     -300,
    "maintain":    0,
    "gain":     +250,
}


def calculate_tdee(
    weight_kg: float,
    height_cm: float,
    age: int,
    sex: str,
    activity_level: str,
    goal: str,
) -> int:
    #calcula el objetivo calórico diario usando Mifflin-St Jeor. Devuelve kcal redondeadas al entero más cercano
    if sex == "male":
        tmb = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        tmb = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    factor = ACTIVITY_FACTORS.get(activity_level, 1.2)
    tdee = tmb * factor

    adjustment = GOAL_ADJUSTMENTS.get(goal, 0)
    return round(tdee + adjustment)


def get_nutrition_profile(db: Session, user_id):
    return db.query(NutritionProfile).filter(
        NutritionProfile.user_id == user_id
    ).first()


def create_or_update_profile(db: Session, user_id, age: int, sex: str, activity_level: str):
    #crea o actualiza el NutritionProfile del usuario. Lee weight_kg, height_cm y goal directamente de User para calcular TDEE
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    #valores por defecto si el usuario no completó su perfil todavía
    weight = user.weight_kg or 70.0
    height = user.height_cm or 170.0
    goal = user.goal or "maintain"

    objetivo_kcal = calculate_tdee(weight, height, age, sex, activity_level, goal)

    profile = get_nutrition_profile(db, user_id)
    if profile:
        profile.age = age
        profile.sex = sex
        profile.activity_level = activity_level
        profile.objetivo_kcal = objetivo_kcal
        profile.updated_at = datetime.utcnow()
    else:
        profile = NutritionProfile(
            user_id=user_id,
            age=age,
            sex=sex,
            activity_level=activity_level,
            objetivo_kcal=objetivo_kcal,
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile, user


def get_meals_today(db: Session, user_id):
    #devuelve todas las comidas del usuario para el día actual
    today = date.today()
    return db.query(Meal).filter(
        Meal.user_id == user_id,
        Meal.date == today,
    ).order_by(Meal.created_at).all()


def create_meal(db: Session, user_id, name: str, description: str, time: str, macros, ai_suggested: bool):
    proteina = macros.proteina if macros else 0
    carbos   = macros.carbos   if macros else 0
    grasas   = macros.grasas   if macros else 0
    #fórmula estándar: 4 kcal/g proteína, 4 kcal/g carbos, 9 kcal/g grasa
    kcal = proteina * 4 + carbos * 4 + grasas * 9

    meal = Meal(
        user_id=user_id,
        date=date.today(),
        name=name,
        description=description,
        time=time,
        status="pending",
        proteina_g=proteina,
        carbos_g=carbos,
        grasas_g=grasas,
        kcal=kcal,
        ai_suggested=ai_suggested,
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


def update_meal_status(db: Session, meal_id, user_id, new_status: str):
    #actualiza el status de una comida. Verifica que la comida pertenezca al usuario autenticado
    meal = db.query(Meal).filter(
        Meal.id == meal_id,
        Meal.user_id == user_id,
    ).first()
    if not meal:
        return None
    meal.status = new_status
    db.commit()
    db.refresh(meal)
    return meal