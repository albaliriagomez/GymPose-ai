from database import engine, Base
from models.models import User, Session, Repetition, Nutrition # Agregado Nutrition

def create_tables():
    print("Sincronizando modelos con Supabase...")
    Base.metadata.create_all(bind=engine)
    print("✅ Esquema actualizado correctamente.")

if __name__ == "__main__":
    create_tables()