import io
import os
import pytest

# Ensure the app uses a predictable DB during tests (defaults to sqlite file already).
os.environ.setdefault("DATABASE_URL", "sqlite:///agrismart_test.db")


@pytest.fixture(scope="session", autouse=True)
def mock_yolo_and_seed_db():
    # Mock YOLO to avoid requiring real model files and heavy inference
    import Backend.core.yolo as yolo

    class _DummyResult:
        def __init__(self):
            self.names = {0: "LeafRust"}

            class _Box:
                def __init__(self):
                    self.cls = 0
                    self.conf = 0.95

            class _Boxes(list):
                pass

            self.boxes = _Boxes([_Box()])

    class _DummyModel:
        def predict(self, image):
            return [_DummyResult()]

    yolo.get_model_for_crop = lambda crop: _DummyModel()

    # Also patch the app-level helper used by /predict
    try:
        import Backend.app as app_module
        app_module.get_model_for_crop = lambda crop: _DummyModel()
    except Exception:
        pass

    # Initialize DB tables once for the test session
    from Backend.db import Base, engine
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def client():
    from Backend.app import app
    return app.test_client()


