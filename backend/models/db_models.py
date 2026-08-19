import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from database import Base

class BlueprintModel(Base):
    __tablename__ = "blueprints"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    description = Column(String(256), default="")
    venue_type = Column(String(64), default="stadium")  # stadium, railway, temple, rally, mall, festival, custom
    width = Column(Float, default=120.0)
    length = Column(Float, default=80.0)
    scale = Column(Float, default=1.0)
    elements = Column(JSON, default=list)  # JSON array of walls, gates, barricades, etc.
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SimulationSnapshotModel(Base):
    __tablename__ = "simulation_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    blueprint_id = Column(String(64), index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    total_crowd = Column(Integer)
    risk_score = Column(Float)
    evacuation_time_sec = Column(Float, nullable=True)
    max_density = Column(Float)
    bottlenecks = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)

class SafetyReportModel(Base):
    __tablename__ = "safety_reports"

    id = Column(String(64), primary_key=True, index=True)
    blueprint_id = Column(String(64), index=True)
    venue_name = Column(String(128))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    overall_safety_rating = Column(String(32))
    risk_score = Column(Float)
    summary_data = Column(JSON)
    file_path = Column(String(256), nullable=True)
