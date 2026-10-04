"""Minimal models used only in tests."""
from django.db import models


class Author(models.Model):
    name = models.CharField(max_length=200)

    class Meta:
        app_label = "testapp"


class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name="books")
    tags = models.ManyToManyField("Tag", blank=True)

    class Meta:
        app_label = "testapp"


class Tag(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        app_label = "testapp"


class BookTagLink(models.Model):
    book = models.ForeignKey("Book", on_delete=models.CASCADE)
    tag = models.ForeignKey("Tag", on_delete=models.CASCADE)

    class Meta:
        app_label = "testapp"


class BookWithThrough(models.Model):
    title = models.CharField(max_length=200)
    tags = models.ManyToManyField("Tag", through="BookTagLink", blank=True)

    class Meta:
        app_label = "testapp"


class SpecialBook(Book):
    """Multi-table inheritance child — produces a 'subclass' edge to Book."""
    edition = models.CharField(max_length=50)

    class Meta:
        app_label = "testapp"


class CreatedTimestampField(models.DateTimeField):
    """Custom subclass: `field_type` is the class name, `internal_type` stays DateTimeField."""


class Isbn(models.Model):
    """Primary key not named `id` - exercises FieldInfo.primary_key (issue #111)."""
    code = models.CharField(max_length=13, primary_key=True)
    registered_at = CreatedTimestampField()

    class Meta:
        app_label = "testapp"
