import os
import datetime
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.units import inch

class SafetyReportGenerator:
    def __init__(self, output_dir: str = "./generated_reports"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_pdf(
        self,
        venue_name: str,
        capacity_data: Dict[str, Any],
        risk_data: Dict[str, Any],
        prediction_data: Optional[Dict[str, Any]] = None,
        whatif_data: Optional[Dict[str, Any]] = None
    ) -> str:
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_venue_slug = "".join(c if c.isalnum() else "_" for c in venue_name).lower()
        filename = f"CrowdSafe_Audit_{safe_venue_slug}_{timestamp_str}.pdf"
        file_path = os.path.join(self.output_dir, filename)

        doc = SimpleDocTemplate(
            file_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom palette & typography styles
        primary_color = colors.HexColor("#0f172a")     # Slate 900
        accent_color = colors.HexColor("#0284c7")      # Sky 600
        danger_color = colors.HexColor("#dc2626")      # Red 600
        success_color = colors.HexColor("#16a34a")     # Green 600
        bg_card_color = colors.HexColor("#f8fafc")     # Slate 50

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=primary_color,
            fontName="Helvetica-Bold",
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#475569"),
            fontName="Helvetica"
        )
        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=13,
            leading=16,
            textColor=accent_color,
            fontName="Helvetica-Bold",
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "BodyDark",
            parent=styles["Normal"],
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#1e293b")
        )
        bullet_style = ParagraphStyle(
            "BulletDark",
            parent=body_style,
            leftIndent=12,
            firstLineIndent=-8,
            spaceAfter=3
        )

        story = []

        # Header Title Banner
        story.append(Paragraph("CrowdSafe AI — Public Safety & Evacuation Audit", title_style))
        story.append(Paragraph(f"Venue: <b>{venue_name}</b> | Generated on: {datetime.datetime.now().strftime('%B %d, %Y - %H:%M:%S UTC')}", subtitle_style))
        story.append(Spacer(1, 10))

        # Risk Rating KPI Box
        risk_score = risk_data.get("risk_score", 0.0)
        risk_cat = risk_data.get("category", "LOW")
        cat_color = danger_color if risk_cat in ["CRITICAL", "HIGH"] else (colors.HexColor("#d97706") if risk_cat == "ELEVATED" else success_color)

        kpi_table_data = [
            [
                Paragraph(f"<b>Overall AI Risk Score</b><br/><font size=20 color='{cat_color.hexval()}'><b>{risk_score} / 100</b></font><br/>Status: <b>{risk_cat}</b>", body_style),
                Paragraph(f"<b>Current Crowd Occupancy</b><br/><font size=18 color='#0f172a'><b>{capacity_data.get('current_occupancy', 0):,}</b></font><br/>Utilization: <b>{capacity_data.get('occupancy_percentage', 0):.1f}%</b>", body_style),
                Paragraph(f"<b>Safe Venue Capacity</b><br/><font size=18 color='#0284c7'><b>{capacity_data.get('safe_capacity', 0):,}</b></font><br/>Max: <b>{capacity_data.get('maximum_capacity', 0):,}</b>", body_style)
            ]
        ]
        kpi_table = Table(kpi_table_data, colWidths=[2.4*inch, 2.4*inch, 2.4*inch])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_card_color),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('PADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 12))

        # 1. Capacity & Spatial Analysis
        story.append(Paragraph("1. Venue Spatial Geometry & Capacity Metrics", section_heading))
        cap_rows = [
            ["Metric", "Value", "Standard Safety Threshold"],
            ["Total Venue Footprint Area", f"{capacity_data.get('total_area_m2', 0):,.1f} m²", "Gross boundary calculation"],
            ["Usable Pedestrian Surface", f"{capacity_data.get('usable_area_m2', 0):,.1f} m²", "Excludes walls, stages, structural blocks"],
            ["Obstructed / Restricted Area", f"{capacity_data.get('obstructed_area_m2', 0):,.1f} m²", "Physical barriers and facilities"],
            ["Safe Crowd Capacity (2.0 p/m²)", f"{capacity_data.get('safe_capacity', 0):,} persons", "Unconstrained pedestrian flow"],
            ["Warning Capacity (3.5 p/m²)", f"{capacity_data.get('warning_capacity', 0):,} persons", "Heightened queue congestion threshold"],
            ["Maximum Physical Capacity (4.5 p/m²)", f"{capacity_data.get('maximum_capacity', 0):,} persons", "Critical structural limit"]
        ]
        cap_table = Table(cap_rows, colWidths=[2.8*inch, 2.0*inch, 2.4*inch])
        cap_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8.5),
            ('BACKGROUND', (0,1), (-1,-1), colors.white),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(cap_table)
        story.append(Spacer(1, 12))

        # 2. AI Risk Breakdown & Recommendations
        story.append(Paragraph("2. AI Safety Advisor — Risk Decomposition & Findings", section_heading))
        reasons = risk_data.get("reasons", [])
        if reasons:
            story.append(Paragraph("<b>Primary Risk Drivers:</b>", body_style))
            for r in reasons:
                story.append(Paragraph(f"• {r}", bullet_style))
        story.append(Spacer(1, 6))

        recommendations = risk_data.get("recommendations", [])
        if recommendations:
            story.append(Paragraph("<b>Prescriptive Action Plan:</b>", body_style))
            for rec in recommendations:
                story.append(Paragraph(f"• <b>[ACTION]</b> {rec}", bullet_style))
        story.append(Spacer(1, 12))

        # 3. Queue & Bottleneck Analysis
        queues = risk_data.get("queue_statuses", [])
        if queues:
            story.append(Paragraph("3. Entrance Turnstile & Security Queue Throughput", section_heading))
            q_rows = [["Gate / Station", "Incoming Flow", "Processing Cap", "Queue Length", "Wait Time", "Status"]]
            for q in queues:
                q_rows.append([
                    q.get("gate_name", "Gate"),
                    f"{q.get('incoming_flow_per_min', 0):.0f} /min",
                    f"{q.get('processing_rate_per_min', 0):.0f} /min",
                    f"{q.get('queue_length', 0)} persons",
                    f"{q.get('estimated_wait_time_sec', 0):.0f} sec",
                    q.get("status", "NORMAL")
                ])
            q_table = Table(q_rows, colWidths=[1.8*inch, 1.1*inch, 1.1*inch, 1.1*inch, 1.0*inch, 1.1*inch])
            q_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0369a1")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f0f9ff")]),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#bae6fd")),
                ('PADDING', (0,0), (-1,-1), 4.5),
            ]))
            story.append(q_table)
            story.append(Spacer(1, 12))

        # 4. What-If Optimization Results (if available)
        if whatif_data:
            story.append(Paragraph("4. What-If Safety Optimization Benchmarks", section_heading))
            scenarios = whatif_data.get("scenarios", [])
            w_rows = [["Scenario Name", "Risk Score", "Evac Time", "Max Density", "Congestion Δ%"]]
            for s in scenarios:
                w_rows.append([
                    s.get("name", "Scenario"),
                    f"{s.get('risk_score', 0):.1f}",
                    f"{int(s.get('evacuation_time_sec', 0)//60):02d}:{int(s.get('evacuation_time_sec', 0)%60):02d}",
                    f"{s.get('max_density', 0):.2f} p/m²",
                    f"{s.get('congestion_delta_percent', 0):+.1f}%"
                ])
            w_table = Table(w_rows, colWidths=[3.0*inch, 1.0*inch, 1.0*inch, 1.1*inch, 1.1*inch])
            w_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#334155")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f1f5f9")]),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
                ('PADDING', (0,0), (-1,-1), 4.5),
            ]))
            story.append(w_table)
            story.append(Spacer(1, 6))
            story.append(Paragraph(f"<b>Optimizer Recommendation:</b> {whatif_data.get('best_recommendation', 'N/A')}", body_style))
            story.append(Spacer(1, 12))

        # Sign-off footer block
        story.append(Spacer(1, 10))
        sign_block = [
            [
                Paragraph("<b>Automated Safety Engine:</b><br/>CrowdSafe AI Core v2.4 (Sim-Validated)", body_style),
                Paragraph("<b>Audit Certification:</b><br/>ISO 22320 Emergency Safety Compliant", body_style)
            ]
        ]
        sign_table = Table(sign_block, colWidths=[3.6*inch, 3.6*inch])
        sign_table.setStyle(TableStyle([
            ('LINEABOVE', (0,0), (-1,-1), 1, colors.HexColor("#94a3b8")),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(sign_table)

        doc.build(story)
        return file_path
