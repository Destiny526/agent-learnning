"""Order Service - Database connection"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()


def get_database_url():
    mysql_user = os.getenv('MYSQL_USER')
    mysql_password = os.getenv('MYSQL_PASSWORD')
    mysql_host = os.getenv('MYSQL_HOST')
    mysql_port = os.getenv('MYSQL_PORT')
    mysql_database = os.getenv('MYSQL_DATABASE')

    if all([mysql_user, mysql_password, mysql_host, mysql_port, mysql_database]):
        return f"mysql+mysqlconnector://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_database}"

    return "sqlite:///./test.db"


DATABASE_URL = get_database_url()

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False
else:
    connect_args["charset"] = "utf8mb4"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
