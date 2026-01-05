FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

# فقط فایل‌های سایت را کپی کن (نه کل پروژه)
COPY index.html /usr/share/nginx/html/
COPY terms.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY robots.txt /usr/share/nginx/html/
COPY sitemap.xml /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
