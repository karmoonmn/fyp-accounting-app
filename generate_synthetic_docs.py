"""
Synthetic Financial Document Generator
Generates 50 varied financial documents (Invoices, Bills, Receipts, Bank Statements)
across 5 distinct visual layout templates, saving them as PDF, PNG, and JPG,
along with an authoritative ground_truth.json manifest for accuracy benchmarking.
"""

import os
import json
import random
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.abspath("test_dataset")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Fonts
FONT_REGULAR = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_MONO = "C:/Windows/Fonts/consola.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

# Sample data pools
VENDORS = [
    ("Apex Office Supplies Ltd", "55 Market Street, #08-01, Singapore", "INV-2026-"),
    ("CloudScale Hosting Inc", "100 Pine Street, Suite 1250, San Francisco, CA", "CS-"),
    ("Tenaga Regional Utilities", "Wisma TNB, Jalan Timur, Petaling Jaya", "UTIL-"),
    ("Global Logistics Express", "Plot 12 Cargo Hub, Changi South", "AWB-"),
    ("Paper & Print Warehouse", "14 Industrial Ave 3, Jurong", "PP-"),
    ("Quantum Software Solutions", "Level 20 Menara Axiata, KL Sentral", "QS-"),
    ("Star Coffee Roasters", "88 Orchard Road, Singapore", "REC-"),
    ("Metro Telecom Services", "Telecom Tower 5, Cyberjaya", "TEL-"),
    ("Pacific Hardware Supplies", "24 Pioneer Road, Singapore", "PH-"),
    ("Vertex Digital Marketing", "77 Robinson Road, Singapore", "VD-")
]

CUSTOMERS = [
    "Alpha Logistics Sdn Bhd",
    "Beta Creative Studio",
    "Nexus Venture Capital",
    "Silverline Retailers",
    "Pinnacle Engineering"
]

ITEMS_POOL = [
    ("Monthly Cloud Server Instance", 120.00),
    ("A4 Copy Paper (Box of 5)", 45.00),
    ("Commercial High-Speed Broadband", 180.00),
    ("Software Development Subscription", 250.00),
    ("Ergonomic Mesh Office Chair", 320.00),
    ("Local Courier Freight Delivery", 65.00),
    ("Office Refreshments & Catering", 85.50),
    ("Quarterly Domain & SSL Renewal", 75.00),
    ("Electrical Consumption (kWh)", 210.40),
    ("IT Consultation Hourly Rate", 150.00)
]

def render_layout_modern_invoice(doc_id, vendor, customer, doc_no, date, items, tax_rate=0.08):
    """Layout 1: Modern Tech/SaaS Minimalist Layout"""
    W, H = 1200, 1600
    img = Image.new("RGB", (W, H), color="#FFFFFF")
    draw = ImageDraw.Draw(img)

    f_title = get_font(FONT_BOLD, 42)
    f_sub = get_font(FONT_BOLD, 22)
    f_body = get_font(FONT_REGULAR, 20)
    f_bold = get_font(FONT_BOLD, 20)
    f_small = get_font(FONT_REGULAR, 16)

    # Top accent bar
    draw.rectangle([0, 0, W, 24], fill="#0F766E")

    # Header
    draw.text((80, 70), vendor[0].upper(), fill="#0F766E", font=f_title)
    draw.text((80, 125), vendor[1], fill="#64748B", font=f_small)

    draw.text((W - 320, 70), "INVOICE", fill="#1E293B", font=f_title)
    draw.text((W - 320, 125), f"Invoice #: {doc_no}", fill="#334155", font=f_bold)
    draw.text((W - 320, 155), f"Date: {date}", fill="#64748B", font=f_body)

    # Divider
    draw.line([(80, 210), (W - 80, 210)], fill="#E2E8F0", width=2)

    # Bill To
    draw.text((80, 240), "BILLED TO:", fill="#64748B", font=f_sub)
    draw.text((80, 275), customer, fill="#0F172A", font=f_bold)
    draw.text((80, 305), "Attn: Accounts Payable Department", fill="#64748B", font=f_body)

    # Table Header
    draw.rectangle([80, 380, W - 80, 430], fill="#F8FAFC")
    draw.text((100, 395), "DESCRIPTION", fill="#475569", font=f_bold)
    draw.text((700, 395), "QTY", fill="#475569", font=f_bold)
    draw.text((820, 395), "UNIT PRICE", fill="#475569", font=f_bold)
    draw.text((1020, 395), "AMOUNT", fill="#475569", font=f_bold)

    y = 450
    subtotal = 0.0
    for desc, qty, unit_price in items:
        amount = qty * unit_price
        subtotal += amount
        draw.text((100, y), desc, fill="#1E293B", font=f_body)
        draw.text((710, y), str(qty), fill="#1E293B", font=f_body)
        draw.text((820, y), f"${unit_price:.2f}", fill="#1E293B", font=f_body)
        draw.text((1020, y), f"${amount:.2f}", fill="#1E293B", font=f_body)
        draw.line([(80, y + 40), (W - 80, y + 40)], fill="#F1F5F9", width=1)
        y += 55

    tax = subtotal * tax_rate
    total = subtotal + tax

    # Totals summary box
    draw.rectangle([W - 480, y + 40, W - 80, y + 210], fill="#F0FDFA", outline="#0F766E", width=1)
    draw.text((W - 450, y + 60), "Subtotal:", fill="#334155", font=f_body)
    draw.text((W - 200, y + 60), f"${subtotal:.2f}", fill="#334155", font=f_body)

    draw.text((W - 450, y + 100), f"Tax ({int(tax_rate*100)}%):", fill="#334155", font=f_body)
    draw.text((W - 200, y + 100), f"${tax:.2f}", fill="#334155", font=f_body)

    draw.line([(W - 450, y + 140), (W - 100, y + 140)], fill="#0F766E", width=2)
    draw.text((W - 450, y + 155), "Total Amount:", fill="#0F766E", font=f_sub)
    draw.text((W - 220, y + 155), f"${total:.2f}", fill="#0F766E", font=f_sub)

    # Footer
    draw.text((80, H - 100), "Payment Terms: Due within 30 days of receipt. Thank you for your business!", fill="#94A3B8", font=f_small)

    return img, round(subtotal, 2), round(tax, 2), round(total, 2)


def render_layout_classic_bill(doc_id, vendor, customer, doc_no, date, items, tax_rate=0.06):
    """Layout 2: Formal Classic Grid Supplier Bill"""
    W, H = 1200, 1600
    img = Image.new("RGB", (W, H), color="#FFFFFF")
    draw = ImageDraw.Draw(img)

    f_title = get_font(FONT_BOLD, 36)
    f_head = get_font(FONT_BOLD, 19)
    f_body = get_font(FONT_REGULAR, 19)
    f_mono = get_font(FONT_MONO, 18)

    # Outer border
    draw.rectangle([50, 50, W - 50, H - 50], outline="#1E293B", width=2)

    # Header Box
    draw.rectangle([50, 50, W - 50, 180], fill="#F1F5F9")
    draw.text((80, 80), vendor[0], fill="#0F172A", font=f_title)
    draw.text((80, 130), f"Address: {vendor[1]}", fill="#475569", font=f_body)

    # Info grid
    draw.rectangle([50, 180, W - 50, 270], outline="#1E293B", width=1)
    draw.text((80, 200), "DOCUMENT TYPE: SUPPLIER BILL", fill="#0F172A", font=f_head)
    draw.text((80, 230), f"BILL TO: {customer}", fill="#334155", font=f_body)

    draw.text((750, 200), f"BILL NO: {doc_no}", fill="#0F172A", font=f_head)
    draw.text((750, 230), f"ISSUE DATE: {date}", fill="#334155", font=f_body)

    # Items table border
    draw.rectangle([50, 320, W - 50, 950], outline="#1E293B", width=1)
    # Column headers
    draw.rectangle([50, 320, W - 50, 370], fill="#E2E8F0")
    draw.text((70, 335), "NO", fill="#0F172A", font=f_head)
    draw.text((150, 335), "PARTICULARS / ITEM DESCRIPTION", fill="#0F172A", font=f_head)
    draw.text((700, 335), "QTY", fill="#0F172A", font=f_head)
    draw.text((820, 335), "RATE ($)", fill="#0F172A", font=f_head)
    draw.text((980, 335), "AMOUNT ($)", fill="#0F172A", font=f_head)

    # Vertical column dividers
    draw.line([(130, 320), (130, 950)], fill="#CBD5E1", width=1)
    draw.line([(680, 320), (680, 950)], fill="#CBD5E1", width=1)
    draw.line([(800, 320), (800, 950)], fill="#CBD5E1", width=1)
    draw.line([(960, 320), (960, 950)], fill="#CBD5E1", width=1)

    y = 390
    idx = 1
    subtotal = 0.0
    for desc, qty, unit_price in items:
        amount = qty * unit_price
        subtotal += amount
        draw.text((85, y), str(idx), fill="#1E293B", font=f_mono)
        draw.text((150, y), desc, fill="#1E293B", font=f_body)
        draw.text((720, y), str(qty), fill="#1E293B", font=f_mono)
        draw.text((840, y), f"{unit_price:.2f}", fill="#1E293B", font=f_mono)
        draw.text((990, y), f"{amount:.2f}", fill="#1E293B", font=f_mono)
        draw.line([(50, y + 35), (W - 50, y + 35)], fill="#E2E8F0", width=1)
        y += 50
        idx += 1

    tax = subtotal * tax_rate
    total = subtotal + tax

    # Bottom summary
    draw.rectangle([680, 950, W - 50, 1150], fill="#F8FAFC", outline="#1E293B", width=1)
    draw.text((710, 970), "Subtotal:", fill="#334155", font=f_body)
    draw.text((1000, 970), f"${subtotal:.2f}", fill="#334155", font=f_mono)

    draw.text((710, 1020), f"Govt Tax ({int(tax_rate*100)}%):", fill="#334155", font=f_body)
    draw.text((1000, 1020), f"${tax:.2f}", fill="#334155", font=f_mono)

    draw.text((710, 1080), "TOTAL PAYABLE:", fill="#0F172A", font=f_head)
    draw.text((990, 1080), f"${total:.2f}", fill="#0F172A", font=f_head)

    draw.text((80, 1450), "Authorized Signature: _______________________", fill="#475569", font=f_body)

    return img, round(subtotal, 2), round(tax, 2), round(total, 2)


def render_layout_thermal_receipt(doc_id, vendor, customer, doc_no, date, items, tax_rate=0.06):
    """Layout 3: Narrow Thermal Receipt Layout"""
    W, H = 800, 1300
    img = Image.new("RGB", (W, H), color="#FFFDF7") # slight off-white paper
    draw = ImageDraw.Draw(img)

    f_title = get_font(FONT_BOLD, 30)
    f_body = get_font(FONT_MONO, 18)
    f_bold = get_font(FONT_BOLD, 20)

    draw.text((W // 2 - 160, 50), vendor[0][:26], fill="#111827", font=f_title)
    draw.text((W // 2 - 140, 95), "OFFICIAL TAX RECEIPT", fill="#4B5563", font=f_bold)
    draw.text((W // 2 - 180, 130), vendor[1][:38], fill="#6B7280", font=f_body)

    draw.text((60, 180), "--------------------------------------------------", fill="#9CA3AF", font=f_body)
    draw.text((60, 205), f"Receipt No : {doc_no}", fill="#111827", font=f_body)
    draw.text((60, 235), f"Date / Time: {date} 14:22", fill="#111827", font=f_body)
    draw.text((60, 265), f"Customer   : {customer[:28]}", fill="#111827", font=f_body)
    draw.text((60, 290), "--------------------------------------------------", fill="#9CA3AF", font=f_body)

    y = 320
    subtotal = 0.0
    for desc, qty, unit_price in items:
        amount = qty * unit_price
        subtotal += amount
        draw.text((60, y), f"{qty}x {desc[:24]}", fill="#111827", font=f_body)
        draw.text((W - 180, y), f"${amount:>7.2f}", fill="#111827", font=f_body)
        y += 40

    tax = subtotal * tax_rate
    total = subtotal + tax

    draw.text((60, y + 20), "--------------------------------------------------", fill="#9CA3AF", font=f_body)
    draw.text((60, y + 55), "SUBTOTAL", fill="#111827", font=f_body)
    draw.text((W - 180, y + 55), f"${subtotal:>7.2f}", fill="#111827", font=f_body)

    draw.text((60, y + 90), f"TAX ({int(tax_rate*100)}%)", fill="#111827", font=f_body)
    draw.text((W - 180, y + 90), f"${tax:>7.2f}", fill="#111827", font=f_body)

    draw.text((60, y + 130), "TOTAL PAID", fill="#111827", font=f_bold)
    draw.text((W - 200, y + 130), f"${total:>8.2f}", fill="#111827", font=f_bold)
    draw.text((60, y + 165), "--------------------------------------------------", fill="#9CA3AF", font=f_body)

    draw.text((W // 2 - 120, y + 210), "THANK YOU FOR SHOPPING!", fill="#4B5563", font=f_body)

    return img, round(subtotal, 2), round(tax, 2), round(total, 2)


def render_layout_bank_statement(doc_id, bank_name, company, acct_no, date_range, start_bal, txns):
    """Layout 5: Bank Account Statement (Tabular Transaction Log)"""
    W, H = 1400, 1800
    img = Image.new("RGB", (W, H), color="#FFFFFF")
    draw = ImageDraw.Draw(img)

    f_title = get_font(FONT_BOLD, 36)
    f_head = get_font(FONT_BOLD, 18)
    f_body = get_font(FONT_REGULAR, 17)
    f_mono = get_font(FONT_MONO, 17)

    # Bank Top Banner
    draw.rectangle([0, 0, W, 100], fill="#1E3A8A")
    draw.text((80, 30), bank_name.upper(), fill="#FFFFFF", font=f_title)
    draw.text((W - 400, 35), "ACCOUNT STATEMENT", fill="#93C5FD", font=f_head)

    # Info block
    draw.text((80, 130), f"Account Name  : {company}", fill="#0F172A", font=f_head)
    draw.text((80, 165), f"Account Number: {acct_no}", fill="#334155", font=f_body)
    draw.text((80, 195), f"Currency      : USD ($)", fill="#334155", font=f_body)

    draw.text((W - 450, 130), f"Statement Period: {date_range}", fill="#0F172A", font=f_head)
    draw.text((W - 450, 165), f"Opening Balance : ${start_bal:,.2f}", fill="#334155", font=f_body)

    # Table Header
    draw.rectangle([80, 250, W - 80, 300], fill="#F1F5F9", outline="#CBD5E1", width=1)
    draw.text((100, 265), "DATE", fill="#0F172A", font=f_head)
    draw.text((240, 265), "TRANSACTION DESCRIPTION", fill="#0F172A", font=f_head)
    draw.text((750, 265), "REF NO", fill="#0F172A", font=f_head)
    draw.text((900, 265), "WITHDRAWAL (-)", fill="#DC2626", font=f_head)
    draw.text((1070, 265), "DEPOSIT (+)", fill="#16A34A", font=f_head)
    draw.text((1220, 265), "BALANCE", fill="#0F172A", font=f_head)

    y = 320
    curr_bal = start_bal
    total_in = 0.0
    total_out = 0.0

    for t_date, t_desc, t_ref, t_type, t_amt in txns:
        if t_type == "DR":
            withdrawal = f"${t_amt:,.2f}"
            deposit = "-"
            curr_bal -= t_amt
            total_out += t_amt
        else:
            withdrawal = "-"
            deposit = f"${t_amt:,.2f}"
            curr_bal += t_amt
            total_in += t_amt

        draw.text((100, y), t_date, fill="#1E293B", font=f_body)
        draw.text((240, y), t_desc[:36], fill="#1E293B", font=f_body)
        draw.text((750, y), t_ref, fill="#64748B", font=f_mono)
        draw.text((910, y), withdrawal, fill="#DC2626" if withdrawal != "-" else "#64748B", font=f_mono)
        draw.text((1080, y), deposit, fill="#16A34A" if deposit != "-" else "#64748B", font=f_mono)
        draw.text((1230, y), f"${curr_bal:,.2f}", fill="#0F172A", font=f_mono)

        draw.line([(80, y + 35), (W - 80, y + 35)], fill="#F1F5F9", width=1)
        y += 45

    # Summary Footer
    draw.rectangle([80, y + 30, W - 80, y + 120], fill="#EFF6FF", outline="#93C5FD", width=1)
    draw.text((100, y + 45), f"Total Withdrawals: ${total_out:,.2f}", fill="#DC2626", font=f_head)
    draw.text((450, y + 45), f"Total Deposits: ${total_in:,.2f}", fill="#16A34A", font=f_head)
    draw.text((850, y + 45), f"Closing Balance: ${curr_bal:,.2f}", fill="#1E3A8A", font=f_title)

    return img, curr_bal, total_in, total_out


def main():
    random.seed(42)
    ground_truth = []

    print("Generating 50 synthetic financial documents...")

    # 1. Generate 20 Invoices (Layout 1 & 2)
    for i in range(1, 21):
        vendor = random.choice(VENDORS)
        customer = random.choice(CUSTOMERS)
        doc_no = f"{vendor[2]}{1000 + i}"
        date = f"2026-05-{random.randint(1, 28):02d}"
        due_date = f"2026-06-{random.randint(1, 28):02d}"

        # 2 to 4 items
        k = random.randint(2, 4)
        selected_items = random.sample(ITEMS_POOL, k)
        items = [(desc, random.randint(1, 5), price) for desc, price in selected_items]

        if i % 2 == 1:
            img, subtotal, tax, total = render_layout_modern_invoice(i, vendor, customer, doc_no, date, items)
            fmt = "pdf" if i <= 10 else "png"
        else:
            img, subtotal, tax, total = render_layout_classic_bill(i, vendor, customer, doc_no, date, items)
            fmt = "jpg" if i <= 10 else "pdf"

        file_name = f"doc_{i:02d}_invoice.{fmt}"
        file_path = os.path.join(OUTPUT_DIR, file_name)

        if fmt == "pdf":
            img.save(file_path, "PDF", resolution=150.0)
        else:
            img.save(file_path, quality=95)

        ground_truth.append({
            "doc_id": i,
            "filename": file_name,
            "document_type": "invoice",
            "vendor_name": vendor[0],
            "customer_name": customer,
            "doc_number": doc_no,
            "date": date,
            "due_date": due_date,
            "subtotal": subtotal,
            "tax": tax,
            "total_amount": total,
            "line_items_count": len(items)
        })

    # 2. Generate 20 Bills / Expenses (Layout 2 & 3)
    for i in range(21, 41):
        vendor = random.choice(VENDORS)
        customer = random.choice(CUSTOMERS)
        doc_no = f"BILL-2026-{1000 + i}"
        date = f"2026-05-{random.randint(1, 28):02d}"

        k = random.randint(1, 3)
        selected_items = random.sample(ITEMS_POOL, k)
        items = [(desc, random.randint(1, 4), price) for desc, price in selected_items]

        if i % 2 == 1:
            img, subtotal, tax, total = render_layout_thermal_receipt(i, vendor, customer, doc_no, date, items)
            fmt = "png"
        else:
            img, subtotal, tax, total = render_layout_classic_bill(i, vendor, customer, doc_no, date, items)
            fmt = "pdf"

        file_name = f"doc_{i:02d}_bill.{fmt}"
        file_path = os.path.join(OUTPUT_DIR, file_name)

        if fmt == "pdf":
            img.save(file_path, "PDF", resolution=150.0)
        else:
            img.save(file_path, quality=95)

        ground_truth.append({
            "doc_id": i,
            "filename": file_name,
            "document_type": "bill",
            "vendor_name": vendor[0],
            "customer_name": customer,
            "doc_number": doc_no,
            "date": date,
            "subtotal": subtotal,
            "tax": tax,
            "total_amount": total,
            "line_items_count": len(items)
        })

    # 3. Generate 10 Bank Statements (Layout 5)
    for i in range(41, 51):
        bank = random.choice(["Oversea-Chinese Banking Corp", "DBS Commercial Bank", "United Overseas Bank", "Standard Chartered"])
        company = random.choice(CUSTOMERS)
        acct_no = f"782-901{i}2-4"
        period = "01 May 2026 - 31 May 2026"
        start_bal = random.randint(5000, 25000) * 1.0

        txns = [
            ("03 May", "TRANSFER IN FROM CLIENT", f"TXN{i}01", "CR", 3500.00),
            ("07 May", "PAYMENT UTILITY BILL", f"TXN{i}02", "DR", 450.00),
            ("12 May", "OFFICE RENT WIRE", f"TXN{i}03", "DR", 2800.00),
            ("18 May", "SUPPLIER PAYMENT PAPER CORP", f"TXN{i}04", "DR", 620.00),
            ("25 May", "MERCHANT SALES REVENUE", f"TXN{i}05", "CR", 5400.00),
            ("28 May", "SUBSCRIPTION AWS CLOUD", f"TXN{i}06", "DR", 185.00),
        ]

        img, closing_bal, total_in, total_out = render_layout_bank_statement(i, bank, company, acct_no, period, start_bal, txns)
        fmt = "pdf" if i % 2 == 0 else "png"
        file_name = f"doc_{i:02d}_bank_statement.{fmt}"
        file_path = os.path.join(OUTPUT_DIR, file_name)

        if fmt == "pdf":
            img.save(file_path, "PDF", resolution=150.0)
        else:
            img.save(file_path, quality=95)

        ground_truth.append({
            "doc_id": i,
            "filename": file_name,
            "document_type": "bank_statement",
            "bank_name": bank,
            "company_name": company,
            "account_number": acct_no,
            "statement_period": period,
            "opening_balance": start_bal,
            "closing_balance": round(closing_bal, 2),
            "total_deposits": round(total_in, 2),
            "total_withdrawals": round(total_out, 2)
        })

    # Save Ground Truth Manifest
    manifest_path = os.path.join(OUTPUT_DIR, "ground_truth.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)

    print(f"Successfully generated 50 documents in {OUTPUT_DIR}")
    print(f"Ground truth written to {manifest_path}")

if __name__ == "__main__":
    main()
