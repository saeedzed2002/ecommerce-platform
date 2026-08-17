from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimeStampedModel):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("display_order", "name")
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name


class Product(TimeStampedModel):
    class Type(models.TextChoices):
        LAPTOP = "laptop", "Laptop"
        MOBILE = "mobile", "Mobile"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products"
    )
    product_type = models.CharField(
        max_length=16, choices=Type.choices, default=Type.LAPTOP
    )
    brand = models.CharField(max_length=80, blank=True)
    name = models.CharField(max_length=180)
    slug = models.SlugField(unique=True)
    sku = models.CharField(max_length=64, unique=True)
    short_description = models.CharField(max_length=280, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=0)
    compare_at_price = models.DecimalField(
        max_digits=12, decimal_places=0, blank=True, null=True
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.DRAFT
    )
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.CheckConstraint(
                condition=Q(compare_at_price__isnull=True)
                | Q(compare_at_price__gt=F("price")),
                name="catalog_compare_price_greater_than_price",
            ),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def is_in_stock(self) -> bool:
        return self.stock_quantity > 0

    @property
    def discount_percent(self) -> int:
        if not self.compare_at_price:
            return 0
        return int((Decimal(1) - (self.price / self.compare_at_price)) * 100)

    def clean(self) -> None:
        super().clean()
        if self.compare_at_price and self.compare_at_price <= self.price:
            raise ValidationError(
                {"compare_at_price": "Compare-at price must be greater than price."}
            )


class LaptopSpecification(models.Model):
    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, related_name="laptop_specification"
    )
    processor = models.CharField(max_length=120)
    ram_gb = models.PositiveSmallIntegerField()
    storage_gb = models.PositiveIntegerField()
    display_size_inches = models.DecimalField(max_digits=3, decimal_places=1)
    graphics = models.CharField(max_length=120, blank=True)

    def clean(self) -> None:
        super().clean()
        if self.product.product_type != Product.Type.LAPTOP:
            raise ValidationError(
                {"product": "Laptop details require a laptop product."}
            )

    def __str__(self) -> str:
        return f"Laptop details for {self.product}"


class MobileSpecification(models.Model):
    class Network(models.TextChoices):
        FOUR_G = "4g", "4G"
        FIVE_G = "5g", "5G"

    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, related_name="mobile_specification"
    )
    ram_gb = models.PositiveSmallIntegerField()
    storage_gb = models.PositiveIntegerField()
    camera_megapixels = models.PositiveSmallIntegerField()
    network = models.CharField(max_length=2, choices=Network.choices)
    battery_mah = models.PositiveIntegerField()

    def clean(self) -> None:
        super().clean()
        if self.product.product_type != Product.Type.MOBILE:
            raise ValidationError(
                {"product": "Mobile details require a mobile product."}
            )

    def __str__(self) -> str:
        return f"Mobile details for {self.product}"


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="products/%Y/%m/", blank=True)
    image_url = models.URLField(blank=True)
    alt_text = models.CharField(max_length=180, blank=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("display_order", "id")

    def __str__(self) -> str:
        return f"{self.product.name} image"
