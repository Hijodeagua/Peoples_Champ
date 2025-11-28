from .db.session import engine
from .db.base import Base
from . import models  # this makes sure Player, etc. are registered with Base


def init():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.")


if __name__ == "__main__":
    init()

