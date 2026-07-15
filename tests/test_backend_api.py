from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app

BASELINE_ACTIVITIES = deepcopy(activities)


@pytest.fixture(autouse=True)
def reset_activities_state():
    # Arrange
    activities.clear()
    activities.update(deepcopy(BASELINE_ACTIVITIES))


@pytest.fixture
def client():
    # Arrange
    return TestClient(app)


def test_root_redirects_to_static_index(client):
    # Arrange
    redirect_target = "/static/index.html"

    # Act
    response = client.get("/", follow_redirects=False)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == redirect_target


def test_get_activities_returns_payload_and_cache_header(client):
    # Arrange
    expected_cache_header = "no-store"

    # Act
    response = client.get("/activities")
    payload = response.json()

    # Assert
    assert response.status_code == 200
    assert response.headers["cache-control"] == expected_cache_header
    assert isinstance(payload, dict)
    assert "Chess Club" in payload


def test_signup_adds_new_participant_successfully(client):
    # Arrange
    activity_name = "Chess Club"
    email = "new.student@mergington.edu"

    # Act
    response = client.post(f"/activities/{activity_name}/signup", params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json()["message"] == f"Signed up {email} for {activity_name}"
    assert email in activities[activity_name]["participants"]


def test_signup_returns_404_when_activity_does_not_exist(client):
    # Arrange
    activity_name = "Nonexistent Club"
    email = "student@mergington.edu"

    # Act
    response = client.post(f"/activities/{activity_name}/signup", params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_signup_returns_400_for_duplicate_participant(client):
    # Arrange
    activity_name = "Chess Club"
    email = "michael@mergington.edu"

    # Act
    response = client.post(f"/activities/{activity_name}/signup", params={"email": email})

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up for this activity"


def test_signup_returns_400_when_activity_is_full(client):
    # Arrange
    activity_name = "Math Olympiad"
    max_participants = activities[activity_name]["max_participants"]
    activities[activity_name]["participants"] = [
        f"student{i}@mergington.edu" for i in range(max_participants)
    ]

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": "late.student@mergington.edu"},
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Activity is full"


def test_remove_participant_successfully(client):
    # Arrange
    activity_name = "Chess Club"
    email = "michael@mergington.edu"

    # Act
    response = client.delete(
        f"/activities/{activity_name}/participants", params={"email": email}
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["message"] == f"Removed {email} from {activity_name}"
    assert email not in activities[activity_name]["participants"]


def test_remove_participant_returns_404_for_unknown_activity(client):
    # Arrange
    activity_name = "Nonexistent Club"
    email = "student@mergington.edu"

    # Act
    response = client.delete(
        f"/activities/{activity_name}/participants", params={"email": email}
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_remove_participant_returns_404_for_unknown_participant(client):
    # Arrange
    activity_name = "Chess Club"
    email = "absent.student@mergington.edu"

    # Act
    response = client.delete(
        f"/activities/{activity_name}/participants", params={"email": email}
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student not found in this activity"
