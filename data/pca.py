import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans

# Load dataset
df = pd.read_csv("fifa_players.csv")

# Filter only rows where fifa_version is 23
df = df[df["fifa_version"] == 23]

# Drop unnecessary columns (IDs, URLs, names, dates, and irrelevant text fields)
drop_cols = [
    "player_id", "player_url", "fifa_version", "fifa_update", "fifa_update_date", "short_name", "long_name", 
    "dob", "club_team_id", "club_name", "club_loaned_from", "club_joined_date", "club_contract_valid_until_year",
    "nationality_id", "nationality_name", "nation_team_id", "nation_position", "nation_jersey_number", "player_face_url"
]
df = df.drop(columns=drop_cols)

# Encode categorical features
label_encoders = {}
categorical_cols = ["preferred_foot", "work_rate", "body_type", "real_face", "league_name", "club_position"]
for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    label_encoders[col] = le

# Fill missing values with median
df = df.fillna(df.median())

# Standardize numerical features
scaler = StandardScaler()
df_scaled = scaler.fit_transform(df)

# Apply PCA
pca = PCA(n_components=10)  # Keep top 10 components
pca_result = pca.fit_transform(df_scaled)

# Retrieve PCA loadings
loadings = pd.DataFrame(pca.components_, columns=df.columns, index=[f"PC{i+1}" for i in range(10)])
print("PCA Loadings:")
print(loadings)

# Apply KMeans clustering
kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
df["cluster"] = kmeans.fit_predict(pca_result)

# Visualize clusters
plt.figure(figsize=(10, 6))
sns.scatterplot(x=pca_result[:, 0], y=pca_result[:, 1], hue=df["cluster"], palette="viridis")
plt.xlabel("Principal Component 1")
plt.ylabel("Principal Component 2")
plt.title("Player Clusters Based on PCA")
plt.legend()
plt.show()

# Save clustered data
df.to_csv("fifa_players_clustered.csv", index=False)
