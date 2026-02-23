import json

# Load the questions
with open('src/questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

# Standardized domains based on the exam structure
STANDARD_DOMAINS = {
    'Databricks Intelligence Platform': 'Databricks Intelligence Platform',
    'Development and Ingestion': 'Development and Ingestion',
    'Data Processing & Transformations': 'Data Processing & Transformations',
    'Productionizing Data Pipelines': 'Productionizing Data Pipelines',
    'Data Governance & Quality': 'Data Governance & Quality'
}

# Mapping from old/legacy domains to standardized domains
DOMAIN_MAPPING = {
    # Keep standard domains as-is
    'Databricks Intelligence Platform': 'Databricks Intelligence Platform',
    'Development and Ingestion': 'Development and Ingestion',
    'Data Processing & Transformations': 'Data Processing & Transformations',
    'Productionizing Data Pipelines': 'Productionizing Data Pipelines',
    'Data Governance & Quality': 'Data Governance & Quality',
    
    # Map legacy domains to standard ones
    'Databricks Lakehouse Platform': 'Databricks Intelligence Platform',
    'ELT with Spark SQL and Python': 'Data Processing & Transformations',
    'Incremental Data Processing': 'Development and Ingestion',
    'Production Pipelines': 'Productionizing Data Pipelines',
    'Data Governance': 'Data Governance & Quality',
}

# Update all domains to standard names
updated_count = 0
for q in questions:
    if 'domain' in q:
        old_domain = q['domain']
        new_domain = DOMAIN_MAPPING.get(old_domain, 'Databricks Intelligence Platform')
        if old_domain != new_domain:
            q['domain'] = new_domain
            updated_count += 1

# Save updated questions
with open('src/questions.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"✅ Standardized {updated_count} domain names")
print(f"📊 Total questions: {len(questions)}")

# Print final distribution by domain
domain_counts = {}
for q in questions:
    domain = q.get('domain', 'Unknown')
    domain_counts[domain] = domain_counts.get(domain, 0) + 1

print("\n📈 Final distribution by domain:")
total = len(questions)
for domain, count in sorted(domain_counts.items()):
    percentage = (count / total) * 100
    print(f"  {domain}: {count} questions ({percentage:.1f}%)")

print("\n🎯 Target distribution (based on exam):")
print("  Databricks Intelligence Platform: 10%")
print("  Development and Ingestion: 30%")
print("  Data Processing & Transformations: 31%")
print("  Productionizing Data Pipelines: 18%")
print("  Data Governance & Quality: 11%")
