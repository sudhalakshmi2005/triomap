from flask import Flask, render_template, request, jsonify, send_file, redirect, session
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = "rit_map_2025_secret_key"

EXCEL_FILE = "feedbacks.xlsx"

def save_feedback_to_excel(new_entry):
    """Safely append one feedback to Excel without duplicates or memory issues"""
    if os.path.exists(EXCEL_FILE):
        df = pd.read_excel(EXCEL_FILE)
    else:
        df = pd.DataFrame(columns=["Name", "Location", "Category", "Rating", "Comment", "Time"])

    # Prevent exact duplicates (same comment + location + time within 5 seconds)
    recent_time = datetime.now()
    mask = (
        (df['Location'] == new_entry['Location']) &
        (df['Comment'] == new_entry['Comment']) &
        (pd.to_datetime(df['Time'], format="%d %b %Y, %I:%M %p") > recent_time - pd.Timedelta(seconds=5))
    )
    if mask.any():
        return False  # Duplicate detected

    # Append new feedback
    df = pd.concat([df, pd.DataFrame([new_entry])], ignore_index=True)
    df.to_excel(EXCEL_FILE, index=False)
    return True

def get_all_feedbacks():
    if os.path.exists(EXCEL_FILE):
        try:
            return pd.read_excel(EXCEL_FILE).to_dict('records')
        except:
            return []
    return []

@app.route('/')
def home():
    if 'user' in session:
        return redirect('/map')
    return render_template('login.html')

@app.route('/map')
def map_page():
    if 'user' not in session:
        return redirect('/')
    return render_template('index.html', visitor_name=session['user'])

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/')

@app.route('/submit_login', methods=['POST'])
def submit_login():
    name = request.form.get("name")
    mobile = request.form.get("mobile")
    purpose = request.form.get("purpose")
    if not all([name, mobile, purpose]):
        return "Fill all fields", 400
    session['user'] = name

    login_data = {"Name": name, "Mobile": mobile, "Purpose": purpose,
                  "Time": datetime.now().strftime("%Y-%m-%d %H:%M")}
    file = "logins.xlsx"
    df = pd.read_excel(file) if os.path.exists(file) else pd.DataFrame()
    df = pd.concat([df, pd.DataFrame([login_data])], ignore_index=True)
    df.to_excel(file, index=False)
    return redirect("/map")

@app.route('/submit_feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json()
    name = data.get("name", "Anonymous").strip() or "Anonymous"
    location = data.get("location", "").strip()
    comment = data.get("comment", "").strip()
    category = data.get("category", "General")
    rating = data.get("rating", "5")

    if not location or not comment:
        return jsonify({"error": "Location & comment required"}), 400

    entry = {
        "Name": name,
        "Location": location,
        "Category": category,
        "Rating": f"{rating} stars",
        "Comment": comment,
        "Time": datetime.now().strftime("%d %b %Y, %I:%M %p")
    }

    # This prevents duplicates EVEN if user clicks 10 times clicks or refreshes
    if save_feedback_to_excel(entry):
        return jsonify({
            "message": "Thank you da! Feedback saved",
            "feedbacks": get_all_feedbacks()
        })
    else:
        return jsonify({"message": "Already submitted this feedback! Chill da"}), 200

@app.route('/get_feedbacks')
def get_feedbacks():
    return jsonify(get_all_feedbacks())

@app.route('/download_excel')
def download_excel():
    if os.path.exists(EXCEL_FILE):
        return send_file(EXCEL_FILE,
                        as_attachment=True,
                        download_name=f"RIT_Campus_Feedback_{datetime.now().strftime('%Y%m%d')}.xlsx")
    return "No feedback yet da!", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)